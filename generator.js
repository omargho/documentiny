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
            <td>${param.type}</td>
            <td>${param.description}</td>
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

let createElement = (element) => {
  return `
        <h2 id='${element.id}-title'>${element.title}</h2>
        ${element.description && element.description.length > 0 ? element.description : ''}
        <h3 id='http-request'>HTTP Request</h3>
        <p><code>${element.type.toUpperCase()} http://example.com${element.url}</code></p>
    
    ${element.header ? Object.keys(element.header.fields).map(headerGroup => {
    return `<h3 id='${element.id}-headers'>${headerGroup}</h3>
    ${createHeadersChild(element.header.fields[headerGroup])}`;
  }).join('') : ''}
        
    ${element.parameter ? Object.keys(element.parameter.fields).map(fieldsGroup => {
    return `<h3 id='${element.id}-parameters'>${fieldsGroup}</h3>
    ${createParamsChild(element.parameter.fields[fieldsGroup])}`;
  }).join('') : ''}
        <aside class="success">
            Remember — a happy kitten is an authenticated kitten!
        </aside>`;
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

    <style>
        .highlight table td {
            padding: 5px;
        }

        .highlight table pre {
            margin: 0;
        }

        .highlight .gh {
            color: #999999;
        }

        .highlight .sr {
            color: #f6aa11;
        }

        .highlight .go {
            color: #888888;
        }

        .highlight .gp {
            color: #555555;
        }

        .highlight .gs {
        }

        .highlight .gu {
            color: #aaaaaa;
        }

        .highlight .nb {
            color: #f6aa11;
        }

        .highlight .cm {
            color: #75715e;
        }

        .highlight .cp {
            color: #75715e;
        }

        .highlight .c1 {
            color: #75715e;
        }

        .highlight .cs {
            color: #75715e;
        }

        .highlight .c, .highlight .cd {
            color: #75715e;
        }

        .highlight .err {
            color: #960050;
        }

        .highlight .gr {
            color: #960050;
        }

        .highlight .gt {
            color: #960050;
        }

        .highlight .gd {
            color: #49483e;
        }

        .highlight .gi {
            color: #49483e;
        }

        .highlight .ge {
            color: #49483e;
        }

        .highlight .kc {
            color: #66d9ef;
        }

        .highlight .kd {
            color: #66d9ef;
        }

        .highlight .kr {
            color: #66d9ef;
        }

        .highlight .no {
            color: #66d9ef;
        }

        .highlight .kt {
            color: #66d9ef;
        }

        .highlight .mf {
            color: #ae81ff;
        }

        .highlight .mh {
            color: #ae81ff;
        }

        .highlight .il {
            color: #ae81ff;
        }

        .highlight .mi {
            color: #ae81ff;
        }

        .highlight .mo {
            color: #ae81ff;
        }

        .highlight .m, .highlight .mb, .highlight .mx {
            color: #ae81ff;
        }

        .highlight .sc {
            color: #ae81ff;
        }

        .highlight .se {
            color: #ae81ff;
        }

        .highlight .ss {
            color: #ae81ff;
        }

        .highlight .sd {
            color: #e6db74;
        }

        .highlight .s2 {
            color: #e6db74;
        }

        .highlight .sb {
            color: #e6db74;
        }

        .highlight .sh {
            color: #e6db74;
        }

        .highlight .si {
            color: #e6db74;
        }

        .highlight .sx {
            color: #e6db74;
        }

        .highlight .s1 {
            color: #e6db74;
        }

        .highlight .s {
            color: #e6db74;
        }

        .highlight .na {
            color: #a6e22e;
        }

        .highlight .nc {
            color: #a6e22e;
        }

        .highlight .nd {
            color: #a6e22e;
        }

        .highlight .ne {
            color: #a6e22e;
        }

        .highlight .nf {
            color: #a6e22e;
        }

        .highlight .vc {
            color: #ffffff;
        }

        .highlight .nn {
            color: #ffffff;
        }

        .highlight .nl {
            color: #ffffff;
        }

        .highlight .ni {
            color: #ffffff;
        }

        .highlight .bp {
            color: #ffffff;
        }

        .highlight .vg {
            color: #ffffff;
        }

        .highlight .vi {
            color: #ffffff;
        }

        .highlight .nv {
            color: #ffffff;
        }

        .highlight .w {
            color: #ffffff;
        }

        .highlight {
            color: #ffffff;
        }

        .highlight .n, .highlight .py, .highlight .nx {
            color: #ffffff;
        }

        .highlight .ow {
            color: #f92672;
        }

        .highlight .nt {
            color: #f92672;
        }

        .highlight .k, .highlight .kv {
            color: #f92672;
        }

        .highlight .kn {
            color: #f92672;
        }

        .highlight .kp {
            color: #f92672;
        }

        .highlight .o {
            color: #f92672;
        }
    </style>
    <link href="stylesheets/screen.css" rel="stylesheet" media="screen"/>
    <link href="stylesheets/print.css" rel="stylesheet" media="print"/>
    <script src="javascripts/all.js"></script>
</head>

<body class="index" data-languages="[&quot;shell&quot;,&quot;ruby&quot;,&quot;python&quot;,&quot;javascript&quot;]">
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
    <div class="dark-box">
        <div class="lang-selector">
            <a href="#" data-language-name="shell">shell</a>
            <a href="#" data-language-name="ruby">ruby</a>
            <a href="#" data-language-name="python">python</a>
            <a href="#" data-language-name="javascript">javascript</a>
        </div>
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