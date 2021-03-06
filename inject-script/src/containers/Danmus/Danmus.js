import React, { Component } from "react"
// import axios from "axios"

import Danmu from "./Danmu"
import storageManager from "storage.js"
import "./Danmus.css"
// import spConfig from "config"
// import { getDomain, getUrl } from "utils/url"
import { postMsgToIframe } from "utils/iframe"

// import { stickersUrl } from "config/urls"
// let invitationStr = " invites you to "
// let lng = window.navigator.userLanguage || window.navigator.language
// if (lng.indexOf("zh") > -1) {
//   invitationStr = " 邀请你去 "
// }

// function queueHistoryMessages(roomId, msgs) {
// 	let lastM = null
// 	msgs.forEach((m, i) => {
// 		lastM = m
// 		setTimeout(() => {
// 			window.queueAnimationDanmu(m)
// 		}, i * 1200)
// 	})
// 	if (lastM) {
// 		console.log(lastM)
// 		storageManager.set(roomId + "-msg-last-timestamp", lastM.timestamp)
// 	}
// }
// function getHistoryMessage(roomId) {
// 	// console.debug("getHistoryMessage " + roomId)
// 	let url = `${spConfig.webApi}/api/v1/get_comments`

// 	storageManager.get(roomId + "-msg-last-timestamp", (timestamp) => {
// 		if (timestamp) {
// 			url += "&timestamp=" + timestamp
// 		}
// 		// can't make ajax call in content script since chrome 73
// 		// proxy through background script
// 		if (window.chrome && window.chrome.extension) {
// 			window.chrome.runtime.sendMessage(
// 				{
// 					makeRequest: true,
// 					url: url,
// 					options: {
// 						method: "POST",
// 						// headers: headers,
// 					},
// 				},
// 				(response) => {
// 					if (response && response.ok) {
// 						queueHistoryMessages(roomId, response.data)
// 					} else {
// 						console.error(response)
// 					}
// 				}
// 			)
// 		} else {
// 			axios
// 				.get(url)
// 				.then((response) => {
// 					queueHistoryMessages(roomId, response.data)
// 				})
// 				.catch((err) => {
// 					console.error(err)
// 				})
// 				.then((res) => {})
// 		}
// 	})
// }

class AnimationDanmu extends Component {
	// TODO: use functional component for consistency
	ROW_NUM = 10
	danmuId = 0 // unique identifier of a danmu, increment locally
	state = {
		danmuList: [],
		showDanmu: true,
	}
	danmuWaitList = []

	constructor(props) {
		super(props)
		this.realtimeDanmuWrapperRef = React.createRef()
		// this.props.setQueueDanmu(this.queueDanmu)
		window.queueDanmu = this.queueDanmu
	}

	addDanmu = (danmu) => {
		this.setState((state, props) => {
			state.danmuList.push(danmu)
			return { danmuList: state.danmuList }
		})
	}

	removeDanmu = (id) => {
		this.setState((state, props) => {
			let newList = state.danmuList.filter((danmu) => {
				return danmu.id !== id
			})
			return { danmuList: newList }
		})
	}

	createDanmuObj = (data) => {
		const content = data.content
		const contentType = content.type
		const danmu = { ...data, id: this.danmuId++, row: 1 }
		danmu.content = content.value
		danmu.roomName = data.roomName
		// if image body
		if (contentType === "sticker") {
			danmu.img = true
			danmu.imgSrc = content.value
		}
		if (contentType === "image") {
			danmu.content = "img"
		}
		if (contentType === "file") {
			danmu.content = "file"
		}
		if (contentType === "url") {
			danmu.content = content.title
		}

		// if (data.roomName) {

		// 	danmu.content = `【${data.roomName}】 ${danmu.content}`
		// }
		// if (contentType == "text") {
		// 	danmu.content =
		// }
		// if (data.type === "video") {
		//   danmu.content = "视频"
		// }
		return danmu
	}
	findSpot = () => {
		let occupiedRows = {}
		const spacing = 50 // and avatar space
		this.state.danmuList.forEach((danmu) => {
			let x =
				danmu.ref.danmuRef.current.getBoundingClientRect().left +
				danmu.ref.danmuRef.current.offsetWidth +
				spacing
			if (x >= window.innerWidth) {
				occupiedRows[danmu.row] = true
			}
			// TODO: can take multiple rows
		})
		for (let i = 1; i <= this.ROW_NUM; i++) {
			if (!occupiedRows[i]) return i
		}
		return null
	}
	checkDanmuWaitlist = () => {
		while (this.danmuWaitList.length) {
			let availableRow = this.findSpot()
			if (availableRow) {
				// console.log('found spot');
				let danmu = this.danmuWaitList.shift()
				danmu.row = availableRow
				danmu.top = 50 * availableRow
				this.addDanmu(danmu)
			} else {
				console.debug("no spot")
				setTimeout(this.checkDanmuWaitlist, 1000)
				return
			}
		}
	}
	queueDanmu = (msg) => {
		// this function is called by other class
		// bind this to current class
		// console.log('realtime queue ' + msg.content);
		console.debug(msg)
		// if (!msg) return
		// if (this.props.isBlacklisted(msg.user)) {
		// 	return
		// }

		this.danmuWaitList.push(this.createDanmuObj(msg))
		this.checkDanmuWaitlist()
	}
	// receiveMsgFromChatboxFrame = (e) => {
	// 	if (!e || !e.data || !e.data.danmu) return
	// 	this.queueDanmu(e.data)
	// }
	toggleDanmuVisibility = (visible) => {
		if (visible) {
			this.realtimeDanmuWrapperRef.current.style.display = "block"
		} else {
			this.realtimeDanmuWrapperRef.current.style.display = "none"
		}
	}
	componentDidMount() {
		storageManager.get("showDanmu", (showDanmu) => {
			if (showDanmu != null) {
				this.toggleDanmuVisibility(showDanmu)
				this.setState({ showDanmu: showDanmu })
			} else {
				this.toggleDanmuVisibility(true)
			}
		})
		window.addEventListener("message", (e) => {
			if (!e || !e.data) return
			const data = e.data
			if (data.name === "get_settings") {
				postMsgToIframe("show_danmu", this.state.showDanmu)
			}
		})
		storageManager.addEventListener("showDanmu", (showDanmu) => {
			this.toggleDanmuVisibility(showDanmu)
			this.setState({ showDanmu: showDanmu })
			postMsgToIframe("show_danmu", showDanmu)
		})

		// window.addEventListener(
		// 	"message",
		// 	this.receiveMsgFromChatboxFrame,
		// 	false
		// )
		// if (window.chrome && window.chrome.extension) {
		// 	window.chrome.storage.onChanged.addListener((changes, area) => {
		// 		if ("realtimeDanmuEnabled" in changes) {
		// 			const newVal = changes["realtimeDanmuEnabled"]["newValue"]
		// 			this.toggleDanmuVisibility(newVal)
		// 		}
		// 	})
		// }

		// storage.get("realtimeDanmuEnabled", (val) => {
		// 	let showDanmu = spConfig.showDanmu
		// 	if (val != null) {
		// 		console.log(val)
		// 		this.toggleDanmuVisibility(val)
		// 		showDanmu = val
		// 	}
		// 	if (showDanmu) {
		// 		storage.get("noJoin", (noJoin) => {
		// 			noJoin = noJoin || []
		// 			const siteRoomId = getDomain()
		// 			const pageRoomId = getUrl()
		// 			if (!noJoin.includes(siteRoomId)) {
		// 				getHistoryMessage(siteRoomId)
		// 			}
		// 			if (!noJoin.includes(pageRoomId)) {
		// 				getHistoryMessage(pageRoomId)
		// 			}
		// 		})
		// 	}
		// })
	}
	render() {
		return (
			<div id="sp-animation-danmu" ref={this.realtimeDanmuWrapperRef}>
				{this.state.danmuList.map((danmu, index) => (
					<Danmu
						danmu={danmu}
						key={danmu.id}
						ref={(_ref) => {
							danmu.ref = _ref
						}}
						deleteSelf={this.removeDanmu}
					/>
				))}
			</div>
		)
	}
}

export default AnimationDanmu
