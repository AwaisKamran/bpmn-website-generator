const SimpleBpmnModdle = require("bpmn-moddle/dist/index.cjs");
const fileReader = require("./utility/file-reader.js");
const posTagger = require("wink-pos-tagger");
var stem = require("wink-porter2-stemmer");
const classifier = require("./utility/natural-language-proessing/naive-bayes-classifier.js");
const {
  TASK,
  PROCESS,
  ROOT,
  PATH_TO_BPMN_FILE,
} = require("./utility/constants");

function fromFile(file, root, opts) {
  var contents = fileReader(file);
  return read(contents, root, opts);
}

function read(xml, root, opts) {
  return moddle.fromXML(xml, root, opts);
}

function createModdle(additionalPackages, options) {
  return new SimpleBpmnModdle(additionalPackages, options);
}

const moddle = createModdle();
const tagger = posTagger();

fromFile(PATH_TO_BPMN_FILE, ROOT).then((response) => {
  const { rootElement } = response;
  const { rootElements: components } = rootElement;
  const [initialProcesses] = filterProcesses(components, PROCESS);
  const flowElements = initialProcesses.flowElements;
  const filteredFlowElements = filterProcesses(flowElements, TASK);
  const taskNames = filteredFlowElements.map((item) => item.name);

  const pageClassification = [];
  let taggedSentences = [];

  taggedSentences = taskNames.map((item) => {
    pageClassification.push(classifier.predict(item));
    const newItem = item
      .split(" ")
      .map((item) => stem(item))
      .join(" ");

    return tagger.tagSentence(newItem);
  });

  console.log(taggedSentences);
});

function filterProcesses(data, type) {
  return data.filter((item) => item.$type === type);
}
