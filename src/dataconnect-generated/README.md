# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `study-rooms`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListRooms*](#listrooms)
  - [*GetRoomState*](#getroomstate)
- [**Mutations**](#mutations)
  - [*CreateRoom*](#createroom)
  - [*JoinRoom*](#joinroom)
  - [*UpdateActiveDuration*](#updateactiveduration)
  - [*LeaveRoom*](#leaveroom)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `study-rooms`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@produchive/dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@produchive/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@produchive/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `study-rooms` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListRooms
You can execute the `ListRooms` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listRooms(options?: ExecuteQueryOptions): QueryPromise<ListRoomsData, undefined>;

interface ListRoomsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRoomsData, undefined>;
}
export const listRoomsRef: ListRoomsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRooms(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListRoomsData, undefined>;

interface ListRoomsRef {
  ...
  (dc: DataConnect): QueryRef<ListRoomsData, undefined>;
}
export const listRoomsRef: ListRoomsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRoomsRef:
```typescript
const name = listRoomsRef.operationName;
console.log(name);
```

### Variables
The `ListRooms` query has no variables.
### Return Type
Recall that executing the `ListRooms` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRoomsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListRoomsData {
  rooms: ({
    id: UUIDString;
    name: string;
    environment: string;
    maxLimit: number;
    host: {
      displayName?: string | null;
    };
      participantCount: ({
        user: {
          uid: string;
        } & User_Key;
      })[];
  } & Room_Key)[];
}
```
### Using `ListRooms`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRooms } from '@produchive/dataconnect';


// Call the `listRooms()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRooms();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRooms(dataConnect);

console.log(data.rooms);

// Or, you can use the `Promise` API.
listRooms().then((response) => {
  const data = response.data;
  console.log(data.rooms);
});
```

### Using `ListRooms`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRoomsRef } from '@produchive/dataconnect';


// Call the `listRoomsRef()` function to get a reference to the query.
const ref = listRoomsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRoomsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.rooms);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.rooms);
});
```

## GetRoomState
You can execute the `GetRoomState` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getRoomState(vars: GetRoomStateVariables, options?: ExecuteQueryOptions): QueryPromise<GetRoomStateData, GetRoomStateVariables>;

interface GetRoomStateRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetRoomStateVariables): QueryRef<GetRoomStateData, GetRoomStateVariables>;
}
export const getRoomStateRef: GetRoomStateRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getRoomState(dc: DataConnect, vars: GetRoomStateVariables, options?: ExecuteQueryOptions): QueryPromise<GetRoomStateData, GetRoomStateVariables>;

interface GetRoomStateRef {
  ...
  (dc: DataConnect, vars: GetRoomStateVariables): QueryRef<GetRoomStateData, GetRoomStateVariables>;
}
export const getRoomStateRef: GetRoomStateRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getRoomStateRef:
```typescript
const name = getRoomStateRef.operationName;
console.log(name);
```

### Variables
The `GetRoomState` query requires an argument of type `GetRoomStateVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetRoomStateVariables {
  roomId: UUIDString;
}
```
### Return Type
Recall that executing the `GetRoomState` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetRoomStateData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetRoomStateData {
  room?: {
    id: UUIDString;
    name: string;
    environment: string;
    maxLimit: number;
    host: {
      uid: string;
      displayName?: string | null;
    } & User_Key;
      participants: ({
        user: {
          uid: string;
          displayName?: string | null;
        } & User_Key;
          activeDurationSeconds: number;
          joinedAt: TimestampString;
      })[];
  } & Room_Key;
}
```
### Using `GetRoomState`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getRoomState, GetRoomStateVariables } from '@produchive/dataconnect';

// The `GetRoomState` query requires an argument of type `GetRoomStateVariables`:
const getRoomStateVars: GetRoomStateVariables = {
  roomId: ..., 
};

// Call the `getRoomState()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getRoomState(getRoomStateVars);
// Variables can be defined inline as well.
const { data } = await getRoomState({ roomId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getRoomState(dataConnect, getRoomStateVars);

console.log(data.room);

// Or, you can use the `Promise` API.
getRoomState(getRoomStateVars).then((response) => {
  const data = response.data;
  console.log(data.room);
});
```

### Using `GetRoomState`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getRoomStateRef, GetRoomStateVariables } from '@produchive/dataconnect';

// The `GetRoomState` query requires an argument of type `GetRoomStateVariables`:
const getRoomStateVars: GetRoomStateVariables = {
  roomId: ..., 
};

// Call the `getRoomStateRef()` function to get a reference to the query.
const ref = getRoomStateRef(getRoomStateVars);
// Variables can be defined inline as well.
const ref = getRoomStateRef({ roomId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getRoomStateRef(dataConnect, getRoomStateVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.room);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.room);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `study-rooms` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateRoom
You can execute the `CreateRoom` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createRoom(vars: CreateRoomVariables): MutationPromise<CreateRoomData, CreateRoomVariables>;

interface CreateRoomRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateRoomVariables): MutationRef<CreateRoomData, CreateRoomVariables>;
}
export const createRoomRef: CreateRoomRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createRoom(dc: DataConnect, vars: CreateRoomVariables): MutationPromise<CreateRoomData, CreateRoomVariables>;

interface CreateRoomRef {
  ...
  (dc: DataConnect, vars: CreateRoomVariables): MutationRef<CreateRoomData, CreateRoomVariables>;
}
export const createRoomRef: CreateRoomRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createRoomRef:
```typescript
const name = createRoomRef.operationName;
console.log(name);
```

### Variables
The `CreateRoom` mutation requires an argument of type `CreateRoomVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateRoomVariables {
  name: string;
  environment?: string | null;
  maxLimit?: number | null;
}
```
### Return Type
Recall that executing the `CreateRoom` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateRoomData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateRoomData {
  room_insert: Room_Key;
}
```
### Using `CreateRoom`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createRoom, CreateRoomVariables } from '@produchive/dataconnect';

// The `CreateRoom` mutation requires an argument of type `CreateRoomVariables`:
const createRoomVars: CreateRoomVariables = {
  name: ..., 
  environment: ..., // optional
  maxLimit: ..., // optional
};

// Call the `createRoom()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createRoom(createRoomVars);
// Variables can be defined inline as well.
const { data } = await createRoom({ name: ..., environment: ..., maxLimit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createRoom(dataConnect, createRoomVars);

console.log(data.room_insert);

// Or, you can use the `Promise` API.
createRoom(createRoomVars).then((response) => {
  const data = response.data;
  console.log(data.room_insert);
});
```

### Using `CreateRoom`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createRoomRef, CreateRoomVariables } from '@produchive/dataconnect';

// The `CreateRoom` mutation requires an argument of type `CreateRoomVariables`:
const createRoomVars: CreateRoomVariables = {
  name: ..., 
  environment: ..., // optional
  maxLimit: ..., // optional
};

// Call the `createRoomRef()` function to get a reference to the mutation.
const ref = createRoomRef(createRoomVars);
// Variables can be defined inline as well.
const ref = createRoomRef({ name: ..., environment: ..., maxLimit: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createRoomRef(dataConnect, createRoomVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.room_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.room_insert);
});
```

## JoinRoom
You can execute the `JoinRoom` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
joinRoom(vars: JoinRoomVariables): MutationPromise<JoinRoomData, JoinRoomVariables>;

interface JoinRoomRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: JoinRoomVariables): MutationRef<JoinRoomData, JoinRoomVariables>;
}
export const joinRoomRef: JoinRoomRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
joinRoom(dc: DataConnect, vars: JoinRoomVariables): MutationPromise<JoinRoomData, JoinRoomVariables>;

interface JoinRoomRef {
  ...
  (dc: DataConnect, vars: JoinRoomVariables): MutationRef<JoinRoomData, JoinRoomVariables>;
}
export const joinRoomRef: JoinRoomRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the joinRoomRef:
```typescript
const name = joinRoomRef.operationName;
console.log(name);
```

### Variables
The `JoinRoom` mutation requires an argument of type `JoinRoomVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface JoinRoomVariables {
  roomId: UUIDString;
}
```
### Return Type
Recall that executing the `JoinRoom` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `JoinRoomData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface JoinRoomData {
  roomParticipant_upsert: RoomParticipant_Key;
}
```
### Using `JoinRoom`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, joinRoom, JoinRoomVariables } from '@produchive/dataconnect';

// The `JoinRoom` mutation requires an argument of type `JoinRoomVariables`:
const joinRoomVars: JoinRoomVariables = {
  roomId: ..., 
};

// Call the `joinRoom()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await joinRoom(joinRoomVars);
// Variables can be defined inline as well.
const { data } = await joinRoom({ roomId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await joinRoom(dataConnect, joinRoomVars);

console.log(data.roomParticipant_upsert);

// Or, you can use the `Promise` API.
joinRoom(joinRoomVars).then((response) => {
  const data = response.data;
  console.log(data.roomParticipant_upsert);
});
```

### Using `JoinRoom`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, joinRoomRef, JoinRoomVariables } from '@produchive/dataconnect';

// The `JoinRoom` mutation requires an argument of type `JoinRoomVariables`:
const joinRoomVars: JoinRoomVariables = {
  roomId: ..., 
};

// Call the `joinRoomRef()` function to get a reference to the mutation.
const ref = joinRoomRef(joinRoomVars);
// Variables can be defined inline as well.
const ref = joinRoomRef({ roomId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = joinRoomRef(dataConnect, joinRoomVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.roomParticipant_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.roomParticipant_upsert);
});
```

## UpdateActiveDuration
You can execute the `UpdateActiveDuration` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateActiveDuration(vars: UpdateActiveDurationVariables): MutationPromise<UpdateActiveDurationData, UpdateActiveDurationVariables>;

interface UpdateActiveDurationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateActiveDurationVariables): MutationRef<UpdateActiveDurationData, UpdateActiveDurationVariables>;
}
export const updateActiveDurationRef: UpdateActiveDurationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateActiveDuration(dc: DataConnect, vars: UpdateActiveDurationVariables): MutationPromise<UpdateActiveDurationData, UpdateActiveDurationVariables>;

interface UpdateActiveDurationRef {
  ...
  (dc: DataConnect, vars: UpdateActiveDurationVariables): MutationRef<UpdateActiveDurationData, UpdateActiveDurationVariables>;
}
export const updateActiveDurationRef: UpdateActiveDurationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateActiveDurationRef:
```typescript
const name = updateActiveDurationRef.operationName;
console.log(name);
```

### Variables
The `UpdateActiveDuration` mutation requires an argument of type `UpdateActiveDurationVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateActiveDurationVariables {
  roomId: UUIDString;
  duration: number;
}
```
### Return Type
Recall that executing the `UpdateActiveDuration` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateActiveDurationData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateActiveDurationData {
  roomParticipant_update?: RoomParticipant_Key | null;
}
```
### Using `UpdateActiveDuration`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateActiveDuration, UpdateActiveDurationVariables } from '@produchive/dataconnect';

// The `UpdateActiveDuration` mutation requires an argument of type `UpdateActiveDurationVariables`:
const updateActiveDurationVars: UpdateActiveDurationVariables = {
  roomId: ..., 
  duration: ..., 
};

// Call the `updateActiveDuration()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateActiveDuration(updateActiveDurationVars);
// Variables can be defined inline as well.
const { data } = await updateActiveDuration({ roomId: ..., duration: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateActiveDuration(dataConnect, updateActiveDurationVars);

console.log(data.roomParticipant_update);

// Or, you can use the `Promise` API.
updateActiveDuration(updateActiveDurationVars).then((response) => {
  const data = response.data;
  console.log(data.roomParticipant_update);
});
```

### Using `UpdateActiveDuration`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateActiveDurationRef, UpdateActiveDurationVariables } from '@produchive/dataconnect';

// The `UpdateActiveDuration` mutation requires an argument of type `UpdateActiveDurationVariables`:
const updateActiveDurationVars: UpdateActiveDurationVariables = {
  roomId: ..., 
  duration: ..., 
};

// Call the `updateActiveDurationRef()` function to get a reference to the mutation.
const ref = updateActiveDurationRef(updateActiveDurationVars);
// Variables can be defined inline as well.
const ref = updateActiveDurationRef({ roomId: ..., duration: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateActiveDurationRef(dataConnect, updateActiveDurationVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.roomParticipant_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.roomParticipant_update);
});
```

## LeaveRoom
You can execute the `LeaveRoom` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
leaveRoom(vars: LeaveRoomVariables): MutationPromise<LeaveRoomData, LeaveRoomVariables>;

interface LeaveRoomRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: LeaveRoomVariables): MutationRef<LeaveRoomData, LeaveRoomVariables>;
}
export const leaveRoomRef: LeaveRoomRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
leaveRoom(dc: DataConnect, vars: LeaveRoomVariables): MutationPromise<LeaveRoomData, LeaveRoomVariables>;

interface LeaveRoomRef {
  ...
  (dc: DataConnect, vars: LeaveRoomVariables): MutationRef<LeaveRoomData, LeaveRoomVariables>;
}
export const leaveRoomRef: LeaveRoomRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the leaveRoomRef:
```typescript
const name = leaveRoomRef.operationName;
console.log(name);
```

### Variables
The `LeaveRoom` mutation requires an argument of type `LeaveRoomVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface LeaveRoomVariables {
  roomId: UUIDString;
}
```
### Return Type
Recall that executing the `LeaveRoom` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `LeaveRoomData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface LeaveRoomData {
  roomParticipant_delete?: RoomParticipant_Key | null;
}
```
### Using `LeaveRoom`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, leaveRoom, LeaveRoomVariables } from '@produchive/dataconnect';

// The `LeaveRoom` mutation requires an argument of type `LeaveRoomVariables`:
const leaveRoomVars: LeaveRoomVariables = {
  roomId: ..., 
};

// Call the `leaveRoom()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await leaveRoom(leaveRoomVars);
// Variables can be defined inline as well.
const { data } = await leaveRoom({ roomId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await leaveRoom(dataConnect, leaveRoomVars);

console.log(data.roomParticipant_delete);

// Or, you can use the `Promise` API.
leaveRoom(leaveRoomVars).then((response) => {
  const data = response.data;
  console.log(data.roomParticipant_delete);
});
```

### Using `LeaveRoom`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, leaveRoomRef, LeaveRoomVariables } from '@produchive/dataconnect';

// The `LeaveRoom` mutation requires an argument of type `LeaveRoomVariables`:
const leaveRoomVars: LeaveRoomVariables = {
  roomId: ..., 
};

// Call the `leaveRoomRef()` function to get a reference to the mutation.
const ref = leaveRoomRef(leaveRoomVars);
// Variables can be defined inline as well.
const ref = leaveRoomRef({ roomId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = leaveRoomRef(dataConnect, leaveRoomVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.roomParticipant_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.roomParticipant_delete);
});
```

