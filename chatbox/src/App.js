import React, { useState, useEffect } from "react"
import { connect } from "react-redux"
import moment from "moment"
import axios from "axios"
import { message } from "antd"
// import { Rnd } from "react-rnd"

import storageManager from "storage"
import config from "config"
import Tab from "Tab"
import { setAccount, setActiveTab } from "redux/actions"
import { getDomain } from "utils"

require("moment/locale/zh-cn") //moment.js bug, has to manually include

const locale = window.navigator.userLanguage || window.navigator.language
moment.locale(locale)

function App({ account, setAccount, activeTab, setActiveTab }) {
	// wait for localStorage finish loading before rendering anything
	// ready can only change from false to true for one time!
	const [ready, setReady] = useState(false)
	const [storageData, setStorageData] = useState()
	const [socket, setSocket] = useState(null)
	const [unread, setUnread] = useState(false)
	// const [connected, setConnected] = useState(false)
	// can't use 'connected' to trigger reconnection with useEffect
	// since connected is also set in useEffect, it causes infinite loop
	const [disconnectedCounter, setDisconnectedCounter] = useState(0)
	const [socketIsLoggedIn, setSocketIsLoggedIn] = useState(false)
	// const position = config.position
	// const size = config.size

	// TODO: check url change
	const [url, setUrl] = useState()
	const [domain, setDomain] = useState()
	const token = account && account.token
	useEffect(() => {
		// Load everything from localStorage
		// register all localstorage listeners
		// ask parent frame what's url
		storageManager.addEventListener("account", account => {
			setAccount(account)
		})
		storageManager.addEventListener("unread", unread => {
			setUnread(!!unread)
		})
		window.addEventListener("message", e => {
			if (!e || !e.data) return
			const data = e.data

			if (data.name === "url") {
				setUrl(data.data)
			}
			if (data.name === "unread") {
				setUnread(true)
			}
		})

		// pass null as storage key to get all stored data
		storageManager.get(null, data => {
			setStorageData(data)
			if (data.account) {
				setAccount(data.account)
			} else {
				setActiveTab("account")
			}
			if (window.parent) {
				window.parent.postMessage(
					{
						action: "get_url",
						data: null
					},
					"*"
				)
				window.parent.postMessage(
					{
						action: "get_unread",
						data: null
					},
					"*"
				)
				window.parent.postMessage(
					{
						action: "update_storage_all",
						data: data
					},
					"*"
				)
			} else {
				setUrl(window.location.href)
			}
		})
		console.debug("init should only be called once")
	}, [setAccount, setActiveTab])

	useEffect(() => {
		if (url) {
			setDomain(getDomain(url))
			setReady(true)
		}
	}, [url])

	useEffect(() => {
		if (token) {
			console.debug("creating socket")
			const s = new WebSocket(config.socketUrl)
			window.spSocket = s
			const socketOpenHandler = () => {
				console.debug("socket connected")
				message.success("聊天服务器连接成功！")
				// setConnected(true)
				s.wasConnected = true

				const socketPayload = {
					action: "login",
					data: {
						token: token
					}
				}
				s.send(JSON.stringify(socketPayload))
			}
			const socketCloseHandler = () => {
				if (s.wasConnected) {
					// Show error to user only if it was connected before
					// Otherwise when there is no Internet, this will be shown
					// all the time
					message.error("聊天服务器连接断开！")
				}
				s.closed = true
				// setConnected(false)
				setDisconnectedCounter(counter => {
					return counter + 1
				})
				console.debug("socket disconnected")
			}
			const socketMessageHandler = e => {
				const msg = JSON.parse(e.data)
				if (msg.name === "login") {
					if (msg.success) {
						message.success("聊天服务器登录成功!")
						setSocketIsLoggedIn(true)
					} else {
						// delete account data to force user re-login
						storageManager.set("account", null)
					}
				}
				if (msg.error) {
					console.error(msg.error)
				}
			}

			s.addEventListener("open", socketOpenHandler)
			s.addEventListener("close", socketCloseHandler)
			s.addEventListener("message", socketMessageHandler)

			setSocket(s)

			return () => {
				window.spSocket = null
				// unregister callbacks
				s.removeEventListener("open", socketOpenHandler)
				s.removeEventListener("close", socketCloseHandler)
				s.removeEventListener("message", socketMessageHandler)
				if (!s.closed) {
					s.close()
				}
				setSocket(null)
				// setConnected(false)
				setSocketIsLoggedIn(false)
			}
		}
	}, [disconnectedCounter, token])

	useEffect(() => {
		console.info("token changed", token)
		if (token) {
			axios.defaults.headers.common["token"] = token
		} else {
			delete axios.defaults.headers.common["token"]
		}
	}, [token])

	return (
		<div className="sp-all">
			{ready && (
				// <Rnd
				// 	className="sp-chatbox-wrapper"
				// 	default={{
				// 		x: position.x,
				// 		y: 0, // y value is overridden in css
				// 		width: size.width,
				// 		height: size.height
				// 	}}
				// 	resizeHandleStyles={{ right: { right: -10 } }}
				// 	dragHandleClassName="ant-tabs-top-bar"
				// 	minWidth={size.minWidth}
				// 	minHeight={size.minHeight}
				// 	maxHeight={window.innerHeight}
				// 	dragAxis="x"
				// 	onDragStop={(e, d) => {
				// 		storageManager.set("iframeX", d.x)
				// 	}}
				// 	onResizeStop={(e, direction, ref, delta, position) => {
				// 		storageManager.set("iframeSize", {
				// 			width: ref.style.width,
				// 			height: ref.style.height
				// 		})
				// 	}}
				// >
				<div className="sp-chatbox-wrapper">
					<Tab
						// socket is only useful to child component
						// if it's connected and logged in
						socket={socketIsLoggedIn ? socket : null}
						storageData={storageData}
						account={account}
						activeTab={activeTab}
						setActiveTab={setActiveTab}
						url={url}
						domain={domain}
						unread={unread}
					/>
				</div>
				// </Rnd>
			)}
		</div>
	)
}

const stateToProps = state => {
	return {
		account: state.account,
		activeTab: state.activeTab
	}
}
export default connect(stateToProps, {
	setAccount,
	setActiveTab
})(App)
