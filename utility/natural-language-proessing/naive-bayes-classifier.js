const Classifier = require("wink-naive-bayes-text-classifier");
const winkNLP = require("wink-nlp");
const model = require("wink-eng-lite-web-model");

const classifier = Classifier();
const nlp = winkNLP(model);
const its = nlp.its;

const prepTask = function (text) {
  const tokens = [];
  nlp
    .readDoc(text)
    .tokens()
    .filter((t) => t.out(its.type) === "word" && !t.out(its.stopWordFlag))
    .each((t) =>
      tokens.push(
        t.out(its.negationFlag) ? "!" + t.out(its.stem) : t.out(its.stem)
      )
    );
  return tokens;
};

classifier.definePrepTasks([prepTask]);
classifier.defineConfig({ considerOnlyPresence: true, smoothingFactor: 0.5 });

classifier.learn("Select Item", "listing");
classifier.learn("Choose Item", "listing");
classifier.learn("Select Product", "listing");
classifier.learn("Search Items", "listing");
classifier.learn("Search Product", "listing");
classifier.learn("Search Products", "listing");

classifier.learn("Enter Address Details", "Form");
classifier.learn("Enter Payment Details", "Form");
classifier.learn("Enter Shipping Details", "Form");
classifier.learn("Enter Personal Details", "Form");
classifier.learn("Enter Checkout Details", "Form");
classifier.learn("Add Academic Year", "Form");
classifier.learn("Select Academic Term", "Form");
classifier.learn("Enter Product Specifications", "Form");
classifier.consolidate();

module.exports = classifier;
