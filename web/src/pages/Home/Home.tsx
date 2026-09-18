import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import LinearProgress from "@mui/material/LinearProgress";
import HorizontalSection from "./HorizontalSection";
import SearchBar from "./SearchBar";
import "./Home.css";
import {
  useBackdrops,
  useContinueWatching,
  useUserHomeRows,
  useHomeRow,
} from "../../api/hooks/home";
import Footer from "../Footer";
import { isPlatformElectron } from "../../utils/platform";

function Home() {
  const { data: backdropsData } = useBackdrops();
  const { data: continueWatchingData, isLoading: isContinueWatchingLoading } =
    useContinueWatching();
  const { data: userHomeRows, isLoading: isUserHomeRowsLoading } =
    useUserHomeRows();
  const homeRows = useHomeRow(
    isUserHomeRowsLoading ? 0 : (userHomeRows?.home_rows?.length ?? 0),
  );
  const [backdropURI, setBackdropURI] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const query = searchQuery.trim();
  const {
    data: searchResults,
    isPending: isSearchPending,
    isError: isSearchError,
  } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: ({ signal }) =>
      axios
        .get("/api/v1/search", { params: { q: debouncedQuery }, signal })
        .then((response) => response.data),
    enabled: !!debouncedQuery,
  });

  const styles = useMemo(
    () => ({
      withBackdrop: {
        backgroundImage: "url(" + backdropURI + ")",
        backgroundSize: "cover",
        animation: "backgroundScroll 150s linear infinite",
      },
    }),
    [backdropURI],
  );

  useEffect(() => {
    if (backdropsData && !backdropURI) {
      setBackdropURI(backdropsData);
    }
  }, [backdropsData, backdropURI]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <>
      <div
        className="home-page-search-section"
        style={backdropURI ? styles.withBackdrop : {}}
      >
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>
      {query ? (
        query !== debouncedQuery || isSearchPending ? (
          <LinearProgress className="progress-margin" />
        ) : (
          <div className="home-page-search-results">
            {isSearchError ? (
              <div className="collection-empty-message home-page-search-message">
                Unable to load search results.
              </div>
            ) : searchResults?.tv_results?.length > 0 ||
              searchResults?.movie_results?.length > 0 ||
              searchResults?.game_results?.length > 0 ? (
              <>
                <HorizontalSection
                  items={searchResults?.tv_results}
                  header="TV Shows"
                  itemType="search"
                  itemOnClick={undefined}
                />
                <HorizontalSection
                  items={searchResults?.movie_results}
                  header="Movies"
                  itemType="search"
                  itemOnClick={undefined}
                />
                <HorizontalSection
                  items={searchResults?.game_results}
                  header="Games"
                  itemType="search"
                  itemOnClick={undefined}
                />
              </>
            ) : (
              <div className="collection-empty-message home-page-search-message">
                No results.
              </div>
            )}
          </div>
        )
      ) : (
        <div className="home-page-main-section">
          {!isContinueWatchingLoading && continueWatchingData?.length > 0 ? (
            <div className="pt-5">
              <HorizontalSection
                items={continueWatchingData}
                header="Continue Watching"
                itemType="watch_tile"
                itemOnClick={undefined}
              />
            </div>
          ) : (
            <></>
          )}
          {homeRows.map((homeRow, index) => {
            if (!(homeRow?.data?.items?.length > 0)) {
              return <></>;
            }
            return (
              <div key={`home-row-${index}`} className="pt-3">
                <HorizontalSection
                  items={homeRow?.data?.items}
                  header={homeRow?.data?.title}
                  itemType={"poster"}
                  itemOnClick={undefined}
                />
                {index !== 0 &&
                  !homeRow.isLoading &&
                  !homeRow.isError &&
                  index !== homeRows?.length - 1 &&
                  homeRow?.data?.items?.length > 0 && (
                    <div className="home-page-section-divider" />
                  )}
              </div>
            );
          })}
        </div>
      )}
      {!isPlatformElectron && <Footer />}
    </>
  );
}

export default Home;
