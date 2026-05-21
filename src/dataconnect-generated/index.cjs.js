const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'study-rooms',
  service: 'produchive',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const createRoomRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateRoom', inputVars);
}
createRoomRef.operationName = 'CreateRoom';
exports.createRoomRef = createRoomRef;

exports.createRoom = function createRoom(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createRoomRef(dcInstance, inputVars));
}
;

const joinRoomRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'JoinRoom', inputVars);
}
joinRoomRef.operationName = 'JoinRoom';
exports.joinRoomRef = joinRoomRef;

exports.joinRoom = function joinRoom(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(joinRoomRef(dcInstance, inputVars));
}
;

const updateActiveDurationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateActiveDuration', inputVars);
}
updateActiveDurationRef.operationName = 'UpdateActiveDuration';
exports.updateActiveDurationRef = updateActiveDurationRef;

exports.updateActiveDuration = function updateActiveDuration(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateActiveDurationRef(dcInstance, inputVars));
}
;

const leaveRoomRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'LeaveRoom', inputVars);
}
leaveRoomRef.operationName = 'LeaveRoom';
exports.leaveRoomRef = leaveRoomRef;

exports.leaveRoom = function leaveRoom(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(leaveRoomRef(dcInstance, inputVars));
}
;

const listRoomsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListRooms');
}
listRoomsRef.operationName = 'ListRooms';
exports.listRoomsRef = listRoomsRef;

exports.listRooms = function listRooms(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listRoomsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getRoomStateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetRoomState', inputVars);
}
getRoomStateRef.operationName = 'GetRoomState';
exports.getRoomStateRef = getRoomStateRef;

exports.getRoomState = function getRoomState(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getRoomStateRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;
