import { ScrollMenu } from "react-horizontal-scrolling-menu";
import "react-horizontal-scrolling-menu/dist/styles.css";
import "./HorizontalSection.css";
import { LeftArrow, RightArrow } from "./arrows";
import ItemCard from "./ItemCard";
import { useNavigate } from "react-router-dom";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

function HorizontalSection(props: {
  items: any;
  header: string;
  headerHref?: string;
  itemType:
    | "poster"
    | "backdrop"
    | "cast"
    | "video"
    | "seasons"
    | "search"
    | "image"
    | "comment"
    | "watch_tile";
  itemOnClick: any | undefined;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  if (!props.items || props.items.length === 0) {
    return <></>;
  }
  return (
    <>
      <div
        className={`horizontal-section horizontal-section-menu horizontal-section-${props.itemType}${props.compact ? " horizontal-section-compact" : ""}`}
      >
        <div
          className="horizontal-section-header cursor-pointer"
          onClick={() => {
            if (props.headerHref) {
              navigate(props.headerHref);
            }
          }}
          role={props.headerHref ? "button" : undefined}
        >
          {props.header}
          {props.headerHref && <ChevronRightIcon fontSize="inherit" style={{ opacity: 0.7 }} />}
        </div>
        <div className="horizontal-scroll-container">
          <ScrollMenu LeftArrow={LeftArrow} RightArrow={RightArrow}>
            {props.items.map((item: any) => (
              <div
                className="horizontal-section-item-container"
                key={item.id ? item.id : item.source_id}
              >
                <ItemCard
                  item={item}
                  showTitle={null}
                  itemType={props.itemType}
                  itemOnClick={props.itemOnClick}
                />
              </div>
            ))}
          </ScrollMenu>
        </div>
      </div>
    </>
  );
}
export default HorizontalSection;
