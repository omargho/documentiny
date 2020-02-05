var apidoc = require('apidoc-core');
var path = require('path');
var _ = require('lodash');
var Markdown = require('markdown-it');
var fs = require('fs');
var PackageInfo = require('./package_info');
var app = {
  log: {},
  markdownParser: null,
  options: {}
};

function createDoc() {
  let options = {'excludeFilters': [''], 'includeFilters': ['.*\\.(clj|cls|coffee|cpp|cs|dart|erl|exs?|go|groovy|ino?|java|js|jsx|kt|litcoffee|lua|mjs|p|php?|pl|pm|py|rb|scala|ts|vue)$'], 'src': ['example'], 'dest': '/tmp/doc', 'template': '/home/og/WebstormProjects/apidoc/template/', 'config': './', 'filters': {}, 'languages': {}, 'parsers': {}, 'workers': {}, 'markdown': true, 'encoding': 'utf8', 'copyDefinitions': true};
  var api;
  var apidocPath = path.join(__dirname, './example/');
  var markdownParser;
  var packageInfo;
  packageInfo = new PackageInfo(app);
  options = _.defaults({}, options, {});

  // Paths.
  options.dest = path.join(options.dest, './');
  options.template = path.join(options.template, './');

  // Line-Ending.
  if (options.lineEnding) {
    if (options.lineEnding === 'CRLF')
      options.lineEnding = '\r\n'; // win32
    else if (options.lineEnding === 'CR')
      options.lineEnding = '\r'; // darwin
    else
      options.lineEnding = '\n'; // linux
  }

  // Options.
  app.options = options;

  // Markdown Parser: enable / disable / use a custom parser.
  if (app.options.markdown === true) {
    markdownParser = new Markdown({
      breaks: false,
      html: true,
      linkify: false,
      typographer: false,
      highlight: function(str, lang) {
        if (lang) {
          return '<pre class="prettyprint lang-' + lang + '">' + str + '</pre>';
        }
        return '<pre class="prettyprint">' + str + '</code></pre>';
      }
    });
  } else if (app.options.markdown !== false) {
    // Include custom Parser @see MARKDOWN.md and test/fixtures/custom_markdown_parser.js
    if (app.options.markdown.substr(0, 2) !== '..' && ((app.options.markdown.substr(0, 1) !== '/' && app.options.markdown.substr(0, 1) !== '~') || app.options.markdown.substr(0, 1) === '.')) {
      app.options.markdown = path.join(process.cwd(), app.options.markdown);
    }
    Markdown = require(app.options.markdown); // Overwrite default Markdown.
    markdownParser = new Markdown();
  }
  app.markdownParser = markdownParser;

  try {

    // generator information
    var json = JSON.parse(fs.readFileSync('./example/apidoc.json', 'utf8'));
    apidoc.setGeneratorInfos({
      name: json.name,
      time: new Date(),
      url: json.homepage,
      version: json.version
    });
    apidoc.setLogger({error: console.error, debug: () => {}, verbose: () => {}});
    app.log = {error: console.error};
    apidoc.setMarkdownParser(markdownParser);
    apidoc.setPackageInfos(packageInfo.get());

    api = apidoc.parse(app.options);

    return api;

  } catch (e) {
    console.error(e.message);
    if (e.stack)
      console.error(e.stack);
    return false;
  }
}

let cleanData = () => {
  let {data} = createDoc({});
  data = JSON.parse(data);
  data = removeDuplicates(data);
  //groupByGroups
  let grouped = {};
  for (let element of data) {
    if (!grouped.hasOwnProperty(element.group)) {
      grouped[element.group] = {name: element.group, elements: []};
    }
    grouped[element.group].elements.push(element);
  }
  console.log(grouped);

};


let removeDuplicates = (data) => {
  return data.filter(
      (item,index) => {
        item.id = item.group+item.name;
        if (index===0) {
          unique = [];
        }
        if (unique.indexOf(item.id) === -1) {
          unique.push(item.id);
          return item;
        }
      });
};

cleanData();
