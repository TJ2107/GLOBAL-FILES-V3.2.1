fetch('http://127.0.0.1:8788/api/data').then(res => {
  console.log(res.status);
  return res.text();
}).then(text => {
  console.log(text);
}).catch(err => {
  console.error(err);
});
