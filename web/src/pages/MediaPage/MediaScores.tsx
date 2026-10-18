import type { MediaScores as MediaScoresData } from "../../api/services/media";
import "./MediaScores.css";

const ICON_BASE_URL = import.meta.env.BASE_URL;

function ScoreIcon(props: { src: string; label: string }) {
  return <img src={ICON_BASE_URL + props.src} title={props.label} />;
}

function MediaScores(props: {
  scores?: MediaScoresData;
  variant?: "row" | "column";
  max?: number;
}) {
  const {
    imdb_score,
    mal_score,
    rt_score,
    rt_votes,
    letterboxd_score,
    metacritic_score,
  } = props.scores ?? {};
  const items = [
    imdb_score != null && {
      key: "imdb",
      icon: <ScoreIcon src="imdb_icon.svg" label="IMDb" />,
      value: imdb_score.toFixed(1),
    },
    mal_score != null && {
      key: "mal",
      icon: <ScoreIcon src="mal_icon.svg" label="MyAnimeList" />,
      value: mal_score.toFixed(1),
    },
    rt_score != null && {
      key: "rt",
      icon:
        rt_score > 75 && (rt_votes ?? 0) > 80 ? (
          <ScoreIcon
            src="rt_certified_fresh_icon.svg"
            label="Rotten Tomatoes (Certified Fresh)"
          />
        ) : rt_score >= 60 ? (
          <ScoreIcon src="rt_fresh_icon.svg" label="Rotten Tomatoes (Fresh)" />
        ) : (
          <ScoreIcon
            src="rt_rotten_icon.svg"
            label="Rotten Tomatoes (Rotten)"
          />
        ),
      value: `${rt_score}%`,
    },
    letterboxd_score != null && {
      key: "letterboxd",
      icon: <ScoreIcon src="letterboxd-icon.svg" label="Letterboxd" />,
      value: letterboxd_score.toFixed(1),
    },
    metacritic_score != null && {
      key: "metacritic",
      icon: <ScoreIcon src="metacritic_icon.svg" label="Metacritic" />,
      value: metacritic_score,
    },
  ]
    .filter(Boolean)
    .slice(0, props.max) as {
    key: string;
    icon: React.ReactNode;
    value: React.ReactNode;
  }[];

  if (items.length === 0) return null;

  return (
    <div className={`media-scores media-scores-${props.variant ?? "row"}`}>
      {items.map((item) => (
        <div key={item.key} className="media-scores-item">
          {item.icon}
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default MediaScores;
