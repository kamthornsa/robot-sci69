const teams = [
  { id: 1, name: "ทีม ๑", school: "ยางตลาดวิทยาคาร" },
  { id: 2, name: "ทีม ๒", school: "ยางตลาดวิทยาคาร" },
  { id: 3, name: "ทีม ๓", school: "ยางตลาดวิทยาคาร" },
  { id: 4, name: "ทีม ๔", school: "เขาวงพิทยาคาร" },
  { id: 5, name: "ทีม ๕", school: "เขาวงพิทยาคาร" },
  { id: 6, name: "ทีม ๖", school: "สมสะอาดพิทยาสรรพ์" },
  { id: 7, name: "ทีม ๗", school: "เมืองกาฬสินธุ์" }
];

const storageKey = "robot-round-robin-results-v1";
const savedResults = JSON.parse(localStorage.getItem(storageKey) || "{}");
const matches = [];
let currentFilter = "all";

// Circle method: 7 รอบ รอบละ 3 คู่ และมี 1 ทีมพักในแต่ละรอบ
function createRoundRobinSchedule(teamList) {
  const bye = { id: 0, name: "พัก", school: "" };
  const rotation = [...teamList, bye];
  const schedule = [];

  for (let round = 1; round < rotation.length; round++) {
    const roundMatches = [];
    let restingTeam = null;

    for (let index = 0; index < rotation.length / 2; index++) {
      const first = rotation[index];
      const second = rotation[rotation.length - 1 - index];
      if (first.id === 0 || second.id === 0) {
        restingTeam = first.id === 0 ? second : first;
        continue;
      }

      const home = round % 2 === 0 ? second : first;
      const away = round % 2 === 0 ? first : second;
      const orderedIds = [home.id, away.id].sort((a, b) => a - b);
      roundMatches.push({
        id: `${orderedIds[0]}-${orderedIds[1]}`,
        home,
        away,
        round,
        restingTeam
      });
    }

    // สลับลำดับคู่ในแต่ละรอบ ลดโอกาสที่ทีมเดิมอยู่คู่ต้น/ท้ายติดกัน
    if (round % 2 === 0) roundMatches.reverse();
    roundMatches.forEach(match => {
      match.restingTeam = restingTeam;
      schedule.push(match);
    });

    rotation.splice(1, 0, rotation.pop());
  }

  return schedule;
}

matches.push(...createRoundRobinSchedule(teams));

function resultText(match, winnerId) {
  if (!winnerId) return "ยังไม่แข่ง";
  const winner = Number(winnerId) === match.home.id ? match.home : match.away;
  return `${winner.name} ชนะ`;
}

function renderMatches() {
  const container = document.querySelector("#matches");
  let previousRound = 0;
  container.innerHTML = matches.map((match, index) => {
    const winner = savedResults[match.id] || "";
    const played = Boolean(winner);
    const hidden = currentFilter === "played" ? !played : currentFilter === "pending" ? played : false;
    const roundHeader = match.round !== previousRound
      ? `<div class="round-heading ${hidden && !matches.filter(item => item.round === match.round).some(item => currentFilter === "all" || (currentFilter === "played" ? savedResults[item.id] : !savedResults[item.id])) ? "hidden" : ""}">
          <span>รอบที่ ${match.round}</span>
          <small>ทีมพัก: ${match.restingTeam.name} · ${match.restingTeam.school}</small>
        </div>`
      : "";
    previousRound = match.round;
    return `
      ${roundHeader}
      <article class="match ${played ? "played" : ""} ${hidden ? "hidden" : ""}" data-status="${played ? "played" : "pending"}">
        <div class="match__number">${String(index + 1).padStart(2, "0")}</div>
        <div class="match__content">
          <div class="match__teams">
            <span>${match.home.name} · ${match.home.school}</span><span class="versus">VS</span><span>${match.away.name} · ${match.away.school}</span>
          </div>
          <select data-match="${match.id}" aria-label="ผลการแข่งขันคู่ที่ ${index + 1}">
            <option value="">ยังไม่แข่ง</option>
            <option value="${match.home.id}" ${String(winner) === String(match.home.id) ? "selected" : ""}>${match.home.name} ชนะ</option>
            <option value="${match.away.id}" ${String(winner) === String(match.away.id) ? "selected" : ""}>${match.away.name} ชนะ</option>
          </select>
        </div>
      </article>`;
  }).join("");

  container.querySelectorAll("select").forEach(select => {
    select.addEventListener("change", event => {
      if (event.target.value) savedResults[event.target.dataset.match] = Number(event.target.value);
      else delete savedResults[event.target.dataset.match];
      localStorage.setItem(storageKey, JSON.stringify(savedResults));
      render();
    });
  });
}

function renderStandings() {
  const table = teams.map(team => ({ ...team, played: 0, wins: 0, losses: 0, points: 0 }));
  Object.entries(savedResults).forEach(([matchId, winnerId]) => {
    const match = matches.find(item => item.id === matchId);
    if (!match) return;
    const winner = table.find(team => team.id === Number(winnerId));
    const loserId = match.home.id === Number(winnerId) ? match.away.id : match.home.id;
    const loser = table.find(team => team.id === loserId);
    if (!winner || !loser) return;
    winner.played++; winner.wins++; winner.points += 3;
    loser.played++; loser.losses++;
  });

  table.sort((a, b) => b.points - a.points || b.wins - a.wins || a.id - b.id);
  document.querySelector("#standingsBody").innerHTML = table.map((team, index) => `
    <tr>
      <td><span class="rank">${index + 1}</span></td>
      <td class="team-cell"><span class="team-name">${team.name}</span><span class="team-school">${team.school}</span></td>
      <td>${team.played}</td><td>${team.wins}</td><td>${team.losses}</td><td class="points">${team.points}</td>
    </tr>`).join("");

  const played = Object.keys(savedResults).filter(id => matches.some(match => match.id === id)).length;
  document.querySelector("#playedMatches").textContent = played;
  document.querySelector("#remainingMatches").textContent = matches.length - played;
}

function render() {
  renderStandings();
  renderMatches();
}

document.querySelectorAll(".filter__button").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll(".filter__button").forEach(item => item.classList.toggle("active", item === button));
    renderMatches();
  });
});

document.querySelector("#resetButton").addEventListener("click", () => {
  if (!Object.keys(savedResults).length || confirm("ต้องการล้างผลการแข่งขันทั้งหมดใช่หรือไม่?")) {
    Object.keys(savedResults).forEach(key => delete savedResults[key]);
    localStorage.removeItem(storageKey);
    render();
  }
});

document.querySelector("#totalMatches").textContent = matches.length;
render();
