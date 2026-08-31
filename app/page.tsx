import DualMap from "../components/DualMap";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>Gaza Change Atlas</h1>
          <p>Event-based satellite comparison and change exploration</p>
        </div>
        <button className="primary">Detect changes</button>
      </header>

      <section className="controls">
        <label>
          Before event
          <select defaultValue="event-2023-10-07">
            <option value="event-2023-10-07">7 Oct 2023 — selected event</option>
            <option value="event-demo">Demo event</option>
          </select>
        </label>
        <label>
          After event
          <select defaultValue="event-demo">
            <option value="event-demo">Closest suitable acquisition</option>
            <option value="manual">Manual selection</option>
          </select>
        </label>
        <label>
          Imagery
          <select defaultValue="true-color">
            <option value="true-color">True color</option>
            <option value="infrared">False color / infrared</option>
            <option value="vegetation">Vegetation index</option>
            <option value="sar">SAR / radar</option>
            <option value="difference">Difference</option>
          </select>
        </label>
      </section>

      <DualMap />

      <section className="info">
        <h2>Methodology preview</h2>
        <p>
          A detected change is an observation, not proof of its cause. OSM features are used
          as contextual geographic data and should not be treated as a historical record unless
          an appropriate historical source is available.
        </p>
      </section>
    </main>
  );
}
