import React, { useState, useEffect } from "react"

import Room from "./Room"
import storageManager from "storage"

function Rooms({ storageData, socket }) {
	const [rooms, setRooms] = useState([])
	const [activeRoomId, setActiveRoomId] = useState()
	useEffect(() => {
		storageManager.addEventListener("activeRoomId", (activeRoomId) => {
			setActiveRoomId(activeRoomId)
		})
		if (storageData) {
			if (storageData.rooms) {
				setRooms(storageData.rooms)

				if (storageData.activeRoomId) {
					setActiveRoomId(storageData.activeRoomId)
				} else {
					if (storageData.rooms.length > 0) {
						setActiveRoomId(storageData.rooms[0].id)
					}
				}
			}
		}
	}, [storageData])

	return (
		<>
			{/* {selectedRoom && selectedRoom.name} */}
			{rooms.map((r) => (
				<Room
					activeRoomId={activeRoomId}
					key={r.id}
					socket={socket}
					room={r}
				/>
			))}
		</>
	)
}

export default Rooms
