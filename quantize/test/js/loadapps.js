const grid = document.getElementById("testgrid");
fetch("json/apps.json")
.then(res => res.json())
.then(data => {

  data.apps.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  data.apps.forEach(item => {
    const a = document.createElement("a");
    a.id = "itemlinkwrapper";
    a.href = `/quantize/${item.name}/index.html`;

    const divitem = document.createElement("div");
    divitem.id = "item";

    const img = document.createElement("img");
    img.id = "gameicon";
    img.src = item.logo;

    divitem.appendChild(img);
    a.appendChild(divitem);
    gamegrid.appendChild(a);
  });
})
.catch(err => console.error(err));
