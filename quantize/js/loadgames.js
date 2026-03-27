// document.getElementById("gamegrid").innerHTML = "<h2>Hello World</h2>";
// console.log(document.getElementById("gamegrid"))
fetch("quantize/games.json")
.then(res => res.json())
.then(data => {
  const gamegrid = document.getElementById("gamegrid");

  data.games.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  data.games.forEach(item => {
    const a = document.createElement("a");
    a.id = "itemlinkwrapper";
    a.href = `/quantize/game/index.html?title=${item.fullname}&file=${item.name}.swf`;

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
