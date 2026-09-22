import "./Activity.css";
import ActivityCalendar from "./ActivityCalendar";
import WatchStats from "./WatchStats";

function Activity(props: any) {
  return (
    <div className="dark-page activity-page">
      <main className="activity-main-container">
        <h1 className="activity-page-title">Your Watch Activity</h1>
        <div className="activity-section-divider" />
        <section className="watch-stats-container" aria-label="Watch statistics">
          <WatchStats />
        </section>
        <div className="activity-section-divider" />
        <section
          className="activity-calendar-container"
          aria-label="Watch activity calendar"
        >
          <ActivityCalendar />
        </section>
      </main>
    </div>
  );
}

export default Activity;
