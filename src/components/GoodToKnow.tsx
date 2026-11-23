export function GoodToKnow() {
  return (
    <section className="panel good-to-know" aria-labelledby="good-to-know-title">
      <div className="panel-head good-to-know__head">
        <div>
          <p className="eyebrow">Good to know</p>
          <h2 id="good-to-know-title">Riding the shuttle</h2>
        </div>
      </div>
      <ul className="good-to-know__list">
        <li>No Wilson Center stop appears on any published timetable.</li>
        <li>
          Ericksen Center is request-only. Call{' '}
          <a href="tel:+16516315310">651-631-5310</a> for a pickup.
        </li>
        <li>
          Public Safety says the shuttle does not run during chapel; the published table still lists
          mid-morning trips.
        </li>
        <li>The finals PDF is from Spring 2024. Its 11:00 PM row is corrected to 11:00 AM here.</li>
      </ul>
    </section>
  );
}
