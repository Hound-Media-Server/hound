import { GitHub } from "@mui/icons-material";
import "./Footer.css";
import { useServerInfo } from "../api/hooks/general";

function Footer(props: any) {
  const { data: serverInfo } = useServerInfo();
  return (
    <div className="footer-main-section">
      <div className="footer-logo-container">
        <img
          src="https://www.themoviedb.org/assets/v4/logos/v2/blue_square_1-5bdc75aaebeb75dc7ae79426ddd9be3b2be1e342510f8202baf6bffa71d7f5c4.svg"
          alt="tmdb-logo"
          id="tmdb-logo"
        />
        <a
          href="https://github.com/Hound-Media-Server/hound"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GitHub sx={{ color: "#FFFFFF", fontSize: "80px" }} />
        </a>
        <a
          href="https://reddit.com/r/HoundMediaServer"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/en/b/bd/Reddit_Logo_Icon.svg"
            alt="reddit-logo"
            id="reddit-logo"
          />
        </a>
      </div>
      <div className="footer-subtitle">
        Hound Media Server {serverInfo?.version}
      </div>
    </div>
  );
}

export default Footer;
