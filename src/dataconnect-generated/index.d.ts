import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateRoomData {
  room_insert: Room_Key;
}

export interface CreateRoomVariables {
  name: string;
  environment?: string | null;
  maxLimit?: number | null;
}

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

export interface GetRoomStateVariables {
  roomId: UUIDString;
}

export interface JoinRoomData {
  roomParticipant_upsert: RoomParticipant_Key;
}

export interface JoinRoomVariables {
  roomId: UUIDString;
}

export interface LeaveRoomData {
  roomParticipant_delete?: RoomParticipant_Key | null;
}

export interface LeaveRoomVariables {
  roomId: UUIDString;
}

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

export interface RoomParticipant_Key {
  roomId: UUIDString;
  userUid: string;
  __typename?: 'RoomParticipant_Key';
}

export interface Room_Key {
  id: UUIDString;
  __typename?: 'Room_Key';
}

export interface UpdateActiveDurationData {
  roomParticipant_update?: RoomParticipant_Key | null;
}

export interface UpdateActiveDurationVariables {
  roomId: UUIDString;
  duration: number;
}

export interface User_Key {
  uid: string;
  __typename?: 'User_Key';
}

interface CreateRoomRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateRoomVariables): MutationRef<CreateRoomData, CreateRoomVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateRoomVariables): MutationRef<CreateRoomData, CreateRoomVariables>;
  operationName: string;
}
export const createRoomRef: CreateRoomRef;

export function createRoom(vars: CreateRoomVariables): MutationPromise<CreateRoomData, CreateRoomVariables>;
export function createRoom(dc: DataConnect, vars: CreateRoomVariables): MutationPromise<CreateRoomData, CreateRoomVariables>;

interface JoinRoomRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: JoinRoomVariables): MutationRef<JoinRoomData, JoinRoomVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: JoinRoomVariables): MutationRef<JoinRoomData, JoinRoomVariables>;
  operationName: string;
}
export const joinRoomRef: JoinRoomRef;

export function joinRoom(vars: JoinRoomVariables): MutationPromise<JoinRoomData, JoinRoomVariables>;
export function joinRoom(dc: DataConnect, vars: JoinRoomVariables): MutationPromise<JoinRoomData, JoinRoomVariables>;

interface UpdateActiveDurationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateActiveDurationVariables): MutationRef<UpdateActiveDurationData, UpdateActiveDurationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateActiveDurationVariables): MutationRef<UpdateActiveDurationData, UpdateActiveDurationVariables>;
  operationName: string;
}
export const updateActiveDurationRef: UpdateActiveDurationRef;

export function updateActiveDuration(vars: UpdateActiveDurationVariables): MutationPromise<UpdateActiveDurationData, UpdateActiveDurationVariables>;
export function updateActiveDuration(dc: DataConnect, vars: UpdateActiveDurationVariables): MutationPromise<UpdateActiveDurationData, UpdateActiveDurationVariables>;

interface LeaveRoomRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: LeaveRoomVariables): MutationRef<LeaveRoomData, LeaveRoomVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: LeaveRoomVariables): MutationRef<LeaveRoomData, LeaveRoomVariables>;
  operationName: string;
}
export const leaveRoomRef: LeaveRoomRef;

export function leaveRoom(vars: LeaveRoomVariables): MutationPromise<LeaveRoomData, LeaveRoomVariables>;
export function leaveRoom(dc: DataConnect, vars: LeaveRoomVariables): MutationPromise<LeaveRoomData, LeaveRoomVariables>;

interface ListRoomsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRoomsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListRoomsData, undefined>;
  operationName: string;
}
export const listRoomsRef: ListRoomsRef;

export function listRooms(options?: ExecuteQueryOptions): QueryPromise<ListRoomsData, undefined>;
export function listRooms(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListRoomsData, undefined>;

interface GetRoomStateRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetRoomStateVariables): QueryRef<GetRoomStateData, GetRoomStateVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetRoomStateVariables): QueryRef<GetRoomStateData, GetRoomStateVariables>;
  operationName: string;
}
export const getRoomStateRef: GetRoomStateRef;

export function getRoomState(vars: GetRoomStateVariables, options?: ExecuteQueryOptions): QueryPromise<GetRoomStateData, GetRoomStateVariables>;
export function getRoomState(dc: DataConnect, vars: GetRoomStateVariables, options?: ExecuteQueryOptions): QueryPromise<GetRoomStateData, GetRoomStateVariables>;

