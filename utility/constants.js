require("dotenv").config();

const START_EVENT = "bpmn:StartEvent";
const TASK = "bpmn:Task";
const COLLABORATION = "bpmn:Collaboration";
const PROCESS = "bpmn:Process";
const EXCLUSIVE_GATEWAY = "bpmn:ExclusiveGateway";
const END_EVENT = "bpmn:EndEvent";
const SEQUENCE_FLOW = "bpmn:SequenceFlow";

const PATH_TO_BPMN_FILE = process.env.EDUCATION;
const ROOT = "bpmn:Definitions";

module.exports = {
  START_EVENT,
  TASK,
  COLLABORATION,
  PROCESS,
  EXCLUSIVE_GATEWAY,
  END_EVENT,
  SEQUENCE_FLOW,
  PATH_TO_BPMN_FILE,
  ROOT,
};
