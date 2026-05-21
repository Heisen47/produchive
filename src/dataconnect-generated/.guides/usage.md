# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createRoom, joinRoom, updateActiveDuration, leaveRoom, listRooms, getRoomState } from '@produchive/dataconnect';


// Operation CreateRoom:  For variables, look at type CreateRoomVars in ../index.d.ts
const { data } = await CreateRoom(dataConnect, createRoomVars);

// Operation JoinRoom:  For variables, look at type JoinRoomVars in ../index.d.ts
const { data } = await JoinRoom(dataConnect, joinRoomVars);

// Operation UpdateActiveDuration:  For variables, look at type UpdateActiveDurationVars in ../index.d.ts
const { data } = await UpdateActiveDuration(dataConnect, updateActiveDurationVars);

// Operation LeaveRoom:  For variables, look at type LeaveRoomVars in ../index.d.ts
const { data } = await LeaveRoom(dataConnect, leaveRoomVars);

// Operation ListRooms: 
const { data } = await ListRooms(dataConnect);

// Operation GetRoomState:  For variables, look at type GetRoomStateVars in ../index.d.ts
const { data } = await GetRoomState(dataConnect, getRoomStateVars);


```