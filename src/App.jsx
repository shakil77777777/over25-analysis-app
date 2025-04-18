import React, { useState } from "react";
import { read, utils } from "xlsx";

export default function App() {
  const [result, setResult] = useState(null);

  function handleFileUpload(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(sheet);

      const analysis = analyzeData(jsonData);
      setResult(analysis);
    };

    reader.readAsArrayBuffer(file);
  }

  function analyzeData(data) {
    const getLast5Matches = (team, currentDate) =>
      data
        .filter(
          (row) =>
            (row.HomeTeam === team || row.AwayTeam === team) &&
            new Date(row.Date) < new Date(currentDate)
        )
        .sort((a, b) => new Date(b.Date) - new Date(a.Date))
        .slice(0, 5);

    let matchesWithCount = {
      scoredGoals15: 0,
      concededGoals13: 0,
      over25_60percent: 0,
      shotsOT4: 0,
      totalMatches: 0,
    };

    data.forEach((match) => {
      const home = match.HomeTeam;
      const away = match.AwayTeam;
      const date = match.Date;

      const homeLast5 = getLast5Matches(home, date);
      const awayLast5 = getLast5Matches(away, date);

      if (homeLast5.length < 5 || awayLast5.length < 5) return;

      const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

      const homeScored = avg(
        homeLast5.map((m) => (m.HomeTeam === home ? m.FTHG : m.FTAG))
      );
      const awayScored = avg(
        awayLast5.map((m) => (m.HomeTeam === away ? m.FTHG : m.FTAG))
      );

      const homeConceded = avg(
        homeLast5.map((m) => (m.HomeTeam === home ? m.FTAG : m.FTHG))
      );
      const awayConceded = avg(
        awayLast5.map((m) => (m.HomeTeam === away ? m.FTAG : m.FTHG))
      );

      const homeOver25 =
        homeLast5.filter((m) => m.FTHG + m.FTAG > 2.5).length / 5;
      const awayOver25 =
        awayLast5.filter((m) => m.FTHG + m.FTAG > 2.5).length / 5;

      const homeShots = avg(
        homeLast5.map((m) => (m.HomeTeam === home ? m.HST : m.AST))
      );
      const awayShots = avg(
        awayLast5.map((m) => (m.HomeTeam === away ? m.HST : m.AST))
      );

      matchesWithCount.totalMatches++;

      if (homeScored >= 1.5 && awayScored >= 1.5)
        matchesWithCount.scoredGoals15++;
      if (homeConceded >= 1.3 && awayConceded >= 1.3)
        matchesWithCount.concededGoals13++;
      if (homeOver25 >= 0.6 && awayOver25 >= 0.6)
        matchesWithCount.over25_60percent++;
      if (homeShots >= 4 && awayShots >= 4) matchesWithCount.shotsOT4++;
    });

    const toPercent = (val) =>
      matchesWithCount.totalMatches === 0
        ? "0%"
        : ((val / matchesWithCount.totalMatches) * 100).toFixed(2) + "%";

    return {
      "Avg Scored Goals 1.5+": toPercent(matchesWithCount.scoredGoals15),
      "Avg Conceded Goals 1.3+": toPercent(matchesWithCount.concededGoals13),
      "Over 2.5 (60%+)": toPercent(matchesWithCount.over25_60percent),
      "Shots OT Avg 4+": toPercent(matchesWithCount.shotsOT4),
    };
  }

  return (
    <div className="p-4 text-center">
      <h1 className="text-xl font-bold mb-4">Over 2.5 Analysis</h1>
      <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} />
      {result && (
        <div className="mt-6 text-left inline-block">
          {Object.entries(result).map(([k, v]) => (
            <p key={k}>
              <strong>{k}:</strong> {v}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
