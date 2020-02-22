var apidoc = require('apidoc-core');
var path = require('path');
var _ = require('lodash');
var Markdown = require('markdown-it');
var fs = require('fs');
var PackageInfo = require('./package_info');
const hljs = require('highlight.js');
var app = {
  log: {},
  markdownParser: null,
  options: {}
};

function createDoc() {
  let options = {'excludeFilters': [''], 'includeFilters': ['.*\\.(clj|cls|coffee|cpp|cs|dart|erl|exs?|go|groovy|ino?|java|js|jsx|kt|litcoffee|lua|mjs|p|php?|pl|pm|py|rb|scala|ts|vue)$'], 'src': ['./example'], 'dest': '/tmp/doc', 'template': '/home/og/WebstormProjects/apidoc/template/', 'config': './', 'filters': {}, 'languages': {}, 'parsers': {}, 'workers': {}, 'markdown': true, 'encoding': 'utf8', 'copyDefinitions': true};
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
          return '<pre><code>' + hljs.highlight(lang, str, true).value + '</code></pre>';
        } else
          return '<div class="prettyprint">' + str + '</code></div>';
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
    apidoc.setLogger({error: console.error, warn: console.log, debug: () => {}, verbose: () => {}});
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

let removeDuplicatesElements = (data) => {
  let unique = {};
  data.forEach(item => {
    item.id = (item.group + '-' + item.name).toLowerCase();
    unique[item.id] = item;
  });
  return Object.values(unique);
};

let createParamsChild = (params) => {
  if (!params || params && params.length === 0) return '';

  return `
  <table> 
    <thead>
        <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
      ${params.map(param => {
    return `
        <tr>
            <td>${param.field}</td>
            <td>${param.type || ''}</td>
            <td>${param.description || ''}</td>
        </tr>`;
  }).join('')}
    </tbody>
  </table>
`;

};

let createHeadersChild = (headers) => {
  if (!headers || headers && headers.length === 0) return '';

  return `
  <table> 
    <thead>
        <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
      ${headers.map(header => {
    return `
        <tr>
            <td>${header.field}</td>
            <td>${header.type}</td>
            <td>${header.description}</td>
        </tr>`;
  }).join('')}
    </tbody>
  </table>
`;

};

let createExamplesChild = (elementId, examples) => {
  if (!examples) return '';
  let buttons = examples.map(example => {
    return `<button class="tablink code-examples-link-${elementId}" onclick="openPage('${elementId + '-' + example.title}', this, '${elementId}')">${example.title}</button>`;
  }).join('');
  return `<div class="code-examples">` + buttons + examples.map((example, index) => {
      try {
        //TODO fix highlighting
        return `<div id="${elementId + '-' + example.title}" class="tabcontent code-examples-content-${elementId} ${index == 0 ? 'defaultOpen' : ''}">
               <div> ${hljs.highlight(example.type, example.content, true).value}</div>
            </div>`;
      } catch (e) {
        return '';
      }
    }
  ).join('') + '</div>';
};

let createElement = (element) => {
  return `
        <!--Title-->
        <h2 id='${element.id}-title'>${element.title}</h2>
        
        <!--Examples-->
        ${createExamplesChild(element.id, element.examples)}
                
        <!--Description-->
        ${element.description && element.description.length > 0 ? element.description : ''}
        
        <!--Endpoint Url-->
        <h3 id='http-request-${element.id}'>HTTP Request</h3>
        <p><code>${element.type.toUpperCase()} http://example.com${element.url}</code></p>
        
        <!--Headers-->
        ${element.header ? Object.keys(element.header.fields).map(headerGroup => {
    return `<h3 id='${element.id}-headers'>${headerGroup}</h3>
    ${createHeadersChild(element.header.fields[headerGroup])}`;
  }).join('') : ''}
        
        <!--Parameters-->
        ${element.parameter ? Object.keys(element.parameter.fields).map((fieldsGroup, index) => {
    return `<h3 id='${element.id}-parameters-${index}'>${fieldsGroup}</h3>
    ${createParamsChild(element.parameter.fields[fieldsGroup])}`;
  }).join('') : ''}
  

        <!--Success Examples-->
        ${element.success && element.success.examples && createExamplesChild(element.id + 'success', element.success.examples) || ''}
        
        <!--Success Parameters-->
        ${element.success && element.success.fields ? Object.keys(element.success.fields).map((fieldsGroup, index) => {
    return `<h3 id='${element.id}-parameters-success-${index}'>${fieldsGroup}</h3>
    ${createParamsChild(element.success.fields[fieldsGroup])}`;
  }).join('') : ''}
        
        <!--Errors Examples-->
        ${element.error && element.error.examples && createExamplesChild(element.id + 'error', element.error.examples) || ''}
        
        <!--Error Parameters-->
        ${element.error && element.error.fields ?
          Object.keys(element.error.fields).map((fieldsGroup, index) => {
            return `<h3 id='${element.id}-parameters-error-${index}'>${fieldsGroup}</h3>
                    ${createParamsChild(element.error.fields[fieldsGroup])}`;

          }).join('') : ''}
    `;
};

let createGroup = (group) => {
  return `<h1 id="${group.name}-group">${group.name}</h1>
    ${group.elements.map(createElement).join('')}`;
};

let createNavMenu = (parsedData) => {

  return `
<ul id="toc" class="toc-list-h1">
${

    parsedData.map(group => {
      return `
      <li>
            <a href="#${group.name}-group" class="toc-h1 toc-link" data-title="${group.name}">${group.name}</a>
            ${

      group.elements && group.elements.length > 0 && `
        <ul class="toc-list-h2">
        ${group.elements.map(element => {
        return `
           <li>
            <a href="#${element.id}-title" class="toc-h2 toc-link" data-title="${element.title}">${element.title}</a>
           </li>
          `;
      }).join('')
        }
        </ul>
        `
        }       
      </li>
      `;
    }).join('')
    }
    </ul>`;
};

let createDocument = (parsedData) => {
  let doc = `<!doctype html>
<html>
<!-- Based on Slate And ApiDoc-->
<!-- https://github.com/slatedocs/slate-->
<!-- https://github.com/apidoc/apidoc-->
<head>
    <meta charset="utf-8">
    <meta content="IE=edge,chrome=1" http-equiv="X-UA-Compatible">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>API Reference</title>

    <link rel="stylesheet" href="../node_modules/highlight.js/styles/monokai-sublime.css">
    <link href="stylesheets/screen.css" rel="stylesheet" media="screen"/>
<!--    <link href="stylesheets/print.css" rel="stylesheet" media="print"/>-->
    <link rel="stylesheet" type="text/css" href="stylesheets/style.css">
    <script src="javascripts/all.js"></script>
    <script src="javascripts/tools.js"></script>
</head>

<body class="index">
<a href="#" id="nav-button">
      <span>
        NAV
        <img src="images/navbar.png" alt="Navbar"/>
      </span>
</a>
<div class="toc-wrapper">
    <img src="images/logo.png" class="logo" alt="Logo"/>
    <div class="lang-selector">
        <a href="#" data-language-name="shell">shell</a>
        <a href="#" data-language-name="ruby">ruby</a>
        <a href="#" data-language-name="python">python</a>
        <a href="#" data-language-name="javascript">javascript</a>
    </div>
    <div class="search">
        <input type="text" class="search" id="input-search" placeholder="Search">
    </div>
    <ul class="search-results"></ul>
    ${createNavMenu(parsedData)} 
    <ul class="toc-footer">
        <li><a href='#'>Sign Up for a Developer Key</a></li>
        <li><a href='https://github.com/lord/slate'>Documentation Powered by Slate</a></li>
    </ul>
</div>
<div class="page-wrapper">
    <div class="dark-box"></div>
    <div class="content">
        
        ${parsedData.map(createGroup).join('')}
        
    </div>
</div>
</body>
</html>
`;
  fs.writeFileSync('./template/mypage.html', doc);
};

let cleanData = () => {
  let {data} = createDoc({});
  data = JSON.parse(data);
  data = removeDuplicatesElements(data);
  //groupByGroups
  let grouped = {};
  for (let element of data) {
    if (!grouped.hasOwnProperty(element.group)) {
      grouped[element.group] = {name: element.group, elements: []};
    }
    grouped[element.group].elements.push(element);
  }
  fs.writeFileSync('grouped.json', JSON.stringify(grouped));
  createDocument(Object.values(grouped));
};

cleanData();
//TODO handel nested fields/arrays (prameters)
//TODO header examples