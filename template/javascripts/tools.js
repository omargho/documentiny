function openPage(pageName, elmnt, id) {
  var i, tabcontent, tablinks;

  tabcontent = document.getElementsByClassName('code-examples-content-' + id);
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = 'none';
  }
  tablinks = document.getElementsByClassName('code-examples-link-' + id);
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].style.backgroundColor = '';
  }
  document.getElementById(pageName).style.display = 'block';
  elmnt.style.backgroundColor = 'transparent';
}