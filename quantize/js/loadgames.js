// document.getElementById("gamegrid").innerHTML = "<h2>Hello World</h2>";
// console.log(document.getElementById("gamegrid"))
fetch("quantize/games.json")
.then(res => res.json())
.then(data => {
  const gamegrid = document.getElementById("gamegrid");

  // Sort alphabetically by item.name
  data.games.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  data.games.forEach(item => {
    const a = document.createElement("a");
    a.id = "itemlinkwrapper";
    a.href = `/game/?title=${item.fullname}&file=/game/${item.name}.swf`;

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


// <a id="itemlinkwrapper" href="/game/?title=Papa's Pizzeria&file=/game/papaspizzeria.swf"><div id="item"><img id="gameicon" src="https://gamegfx.spielaffe.de/images/game/402/402034/35424_papas-burgeria-rcm186x186u.png"></div></a>
// <a id="itemlinkwrapper" href="/game/?title=Papa's Pizzeria&file=/game/papaspizzeria.swf"><div id="item"><img id="gameicon" src="https://quantize.me/img/roguesoul2.jpg"></div></a>
//   <a id="itemlinkwrapper" href="/game/?title=Papa's Pizzeria&file=/game/papaspizzeria.swf"><div id="item"><img id="gameicon" src="https://quantize.me/img/papalouie3.jpg"></div></a>
//   <a id="itemlinkwrapper" href="/game/?title=Papa's Burgeria&file=/game/papasburgeria.swf"><div id="item" style="background-color: hotpink;"><img id="gameicon" src="//gamegfx.spielaffe.de/images/game/402/402034/35424_papas-burgeria-rcm186x186u.png"></div></a>
//   <a id="itemlinkwrapper" href="/game/?title=Papa's Scooperia&file=/game/papasscooperia.swf"><div id="item" style="background-color: aquamarine;"><img id="gameicon" src="//gamegfx.spielaffe.de/images/game/1033/1033000/36426_papas-scooperia-rcm186x186u.png"></div></a>
//   <a id="itemlinkwrapper" href="/game/?title=Redball 4&file=/game/.swf"><div id="item" style="background-color: tomato;"><img id="gameicon" src="https://quantize.me/img/redball.png"></div></a>
//   <a id="itemlinkwrapper" href="/game/?title=Rogue Soul 2&file=/game/rogue-soul-2-game.swf"><div id="item" style="background-color: peachpuff;"><img id="gameicon" src="https://quantize.me/img/roguesoul2.jpg"></div></a>
//   <a id="itemlinkwrapper" href="/game/?title=Run 3&file=/game/Run 3.swf"><div id="item" style="background-color: fuchsia;"><img id="gameicon" src="https://quantize.me/img/run3.png"></div></a>
//   <a id="itemlinkwrapper" href="/game/?title=Papa Louie 3&file=/game/papalouie3.swf&width=700&height=416"><div id="item" style="background-color: deepskyblue;"><img id="gameicon" src="https://quantize.me/img/papalouie3.jpg"></div></a>
//   <a id="itemlinkwrapper" href="/game/?title=Papa's Burgeria&file=/Flash Games/primary_1527111943.swf"><div id="item"><img id="gameicon" src="https://imgs.crazygames.com/auto-covers/primary_1x1.png?format=auto&quality=100&metadata=none&width=1200"></div></a>
//   <div id="itemlinkwrapper"><div id="item"><img class="locked" src="../img/locked.png"></div></div>
//   <div id="itemlinkwrapper"><div id="item"><img class="locked" src="../img/locked.png"></div></div>
//   <div id="itemlinkwrapper"><div id="item"><img class="locked" src="../img/locked.png"></div></div>
//   <div id="itemlinkwrapper"><div id="item"><img class="locked" src="../img/locked.png"></div></div>
