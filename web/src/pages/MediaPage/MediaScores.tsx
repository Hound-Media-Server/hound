import type { MediaScores as MediaScoresData } from "../../api/services/media";
import "./MediaScores.css";
import { formatToThousands } from "../../utils/numberFormat";

const ICON_BASE_URL = import.meta.env.BASE_URL;

function ScoreIcon(props: { src: string; label: string }) {
  return <img src={ICON_BASE_URL + props.src} title={props.label} />;
}

function MediaScores(props: {
  scores?: MediaScoresData;
  variant?: "row" | "column";
  max?: number;
  showVotes?: boolean;
}) {
  const {
    imdb_score,
    imdb_votes,
    mal_score,
    mal_votes,
    rt_score,
    rt_votes,
    letterboxd_score,
    letterboxd_votes,
    metacritic_score,
    metacritic_votes,
  } = props.scores ?? {};
  const items = [
    imdb_score != null && {
      key: "imdb",
      icon: <ScoreIcon src="imdb_icon.svg" label="IMDb" />,
      score: imdb_score.toFixed(1),
      votes: imdb_votes,
    },
    mal_score != null && {
      key: "mal",
      icon: <ScoreIcon src="mal_icon.svg" label="MyAnimeList" />,
      score: mal_score.toFixed(1),
      votes: mal_votes,
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
      score: `${rt_score}%`,
      votes: rt_votes,
    },
    letterboxd_score != null && {
      key: "letterboxd",
      icon: <ScoreIcon src="letterboxd-icon.svg" label="Letterboxd" />,
      score: `${letterboxd_score.toFixed(1)}/5`,
      votes: letterboxd_votes,
    },
    metacritic_score != null && {
      key: "metacritic",
      icon: <ScoreIcon src="metacritic_icon.svg" label="Metacritic" />,
      score: metacritic_score,
      votes: metacritic_votes,
    },
  ]
    .filter(Boolean)
    .slice(0, props.max) as {
    key: string;
    icon: React.ReactNode;
    score: React.ReactNode;
    votes: React.ReactNode;
  }[];

  if (items.length === 0) return null;

  return (
    <div className={`media-scores media-scores-${props.variant ?? "row"}`}>
      {items.map((item) => (
        <div key={item.key} className="media-scores-item">
          {item.icon}
          <span>{item.score}</span>
          {props.showVotes && item.votes && (
            <span className="media-scores-votes">
              ({`${formatToThousands(item.votes as number)}`})
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default MediaScores;
