import React, { useState, useEffect } from "react"
import { connect } from "react-redux"
import moment from "moment"
import axios from "axios"
import { Rnd } from "react-rnd"

import storageManager from "storage"
import config from "config"
import Tab from "Tab"
import { setAccount, setActiveTab } from "redux/actions"
import { getUrl, getDomain } from "utils"

require("moment/locale/zh-cn") //moment.js bug, has to manually include

const locale = window.navigator.userLanguage || window.navigator.language
moment.locale(locale)

function App({ account, setAccount, activeTab, setActiveTab }) {
	// wait for localStorage finish loading before rendering anything
	// ready can only change from false to true for one time!
	const [ready, setReady] = useState(false)
	const [storageData, setStorageData] = useState()

	const position = config.position
	const size = config.size

	// TODO: check url change
	const [url, setUrl] = useState(getUrl())
	const [domain, setDomain] = useState(getDomain())
	const token = account && account.token
	useEffect(() => {
		// Load everything from localStorage
		// register all localstorage listeners
		storageManager.addEventListener("account", account => {
			setAccount(account)
		})
		// pass null as storage key to get all stored data
		storageManager.get(null, data => {
			setStorageData(data)
			if (data.account) {
				setAccount(data.account)
			}
		})

		setReady(true)
	}, [setAccount])

	useEffect(() => {
		console.info("token changed", token)
		if (token) {
			axios.defaults.headers.common["token"] = token
		} else {
			setActiveTab("account")
			delete axios.defaults.headers.common["token"]
		}
	}, [token])

	return (
		<div className="sp-all">
			{ready && (
				<Rnd
					// style={{ display: display }}
					className="sp-chatbox-wrapper"
					default={{
						x: position.x,
						y: 0, // y value is overridden in css
						width: size.width,
						height: size.height
					}}
					resizeHandleStyles={{ right: { right: -10 } }}
					dragHandleClassName="ant-tabs-top-bar"
					minWidth={size.minWidth}
					minHeight={size.minHeight}
					maxHeight={window.innerHeight}
					dragAxis="x"
					onDragStop={(e, d) => {
						storageManager.set("iframeX", d.x)
					}}
					onResizeStop={(e, direction, ref, delta, position) => {
						storageManager.set("iframeSize", {
							width: ref.style.width,
							height: ref.style.height
						})
					}}
				>
					<Tab
						storageData={storageData}
						account={account}
						activeTab={activeTab}
						setActiveTab={setActiveTab}
						url={url}
						domain={domain}
					/>
				</Rnd>
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
