import React, { useMemo, useState } from "react";
import { Calendar, dayjsLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useWatchActivity } from "../../api/hooks/watchHistory";
import { WatchActivity as WatchActivityType } from "../../api/services/watchHistory";
import {
  Button,
  ButtonGroup,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import dayjs from "dayjs";
import { Spinner } from "react-bootstrap";
import ActivityList from "./ActivityList";
import "./ActivityCalendar.css";

const localizer = dayjsLocalizer(dayjs);

const months = Array.from({ length: 12 }, (_, i) =>
  dayjs().month(i).format("MMMM"),
);

const years = Array.from({ length: 10 }, (_, i) => dayjs().year() - 9 + i);

export default function ActivityCalendar() {
  const [date, setDate] = useState<Date>(new Date());
  const [mode, setMode] = useState<"calendar" | "list">("list");

  const startTime = dayjs(date).startOf("month").toISOString();
  const endTime = dayjs(date).endOf("month").toISOString();

  // fetch watch activity for the selected month
  const { data, isLoading } = useWatchActivity(1000, 0, startTime, endTime);

  // format the title in the month view so the season/episode is still shown
  // eg. This show has a long title - S1E2 -> This show has...S1E2
  const formatTitle = useMemo(
    () => (showTitle: string, seasonEpisode: string) => {
      return (
        <div
          style={{
            display: "flex",
            whiteSpace: "nowrap",
            overflow: "hidden",
            width: "100%",
          }}
          title={`${showTitle} - ${seasonEpisode}`}
        >
          <span
            style={{
              flexShrink: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {showTitle}
          </span>
          <span style={{ flexShrink: 0 }}>{` - ${seasonEpisode}`}</span>
        </div>
      );
    },
    [],
  );

  const events = useMemo(() => {
    return (data?.watch_activity || []).map((activity: WatchActivityType) => {
      const timestamp = dayjs(activity.watched_at);
      let title: React.ReactNode = activity.media_title;

      if (activity.record_type === "episode") {
        const seasonEpisode = `S${activity.season_number}E${activity.episode_number}`;
        const showTitle = activity.show_media_title || "Unknown Show";
        title = formatTitle(showTitle, seasonEpisode);
      }
      return {
        title,
        start: timestamp.toDate(),
        end: timestamp.toDate(),
        allDay: false,
      };
    });
  }, [data?.watch_activity, formatTitle]);

  const handleMonthChange = (monthIndex: number) => {
    const newDate = dayjs(date).month(monthIndex).toDate();
    setDate(newDate);
  };

  const handleYearChange = (year: number) => {
    const newDate = dayjs(date).year(year).toDate();
    setDate(newDate);
  };

  const atStart = dayjs(date).isSame(
    dayjs().year(years[0]).startOf("year"),
    "month",
  );
  const atEnd = !dayjs(date).isBefore(dayjs(), "month");

  return (
    <div
      className={`activity-calendar${mode === "list" ? " activity-calendar-list" : ""}`}
    >
      <div className="activity-calendar-filters">
        <div className="activity-date-selectors">
          {/* Year Dropdown */}
          <FormControl className="activity-date-control">
            <InputLabel id="activity-year-label">Year</InputLabel>
            <Select
              labelId="activity-year-label"
              size="small"
              value={dayjs(date).year()}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              label="Year"
              MenuProps={{
                PaperProps: { className: "activity-select-menu" },
              }}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Month Dropdown */}
          <FormControl className="activity-date-control activity-month-control">
            <InputLabel id="activity-month-label">Month</InputLabel>
            <Select
              labelId="activity-month-label"
              size="small"
              value={dayjs(date).month()}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              label="Month"
              MenuProps={{
                PaperProps: { className: "activity-select-menu" },
              }}
            >
              {months.map((month, index) => (
                <MenuItem key={month} value={index}>
                  {month}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <ButtonGroup
          size="small"
          variant="outlined"
          className="activity-nav-buttons"
        >
          <Button
            aria-label="Previous month"
            disabled={atStart}
            onClick={() => setDate(dayjs(date).subtract(1, "month").toDate())}
          >
            <ChevronLeftIcon />
          </Button>
          <Button onClick={() => setDate(new Date())}>Today</Button>
          <Button
            aria-label="Next month"
            disabled={atEnd}
            onClick={() => setDate(dayjs(date).add(1, "month").toDate())}
          >
            <ChevronRightIcon />
          </Button>
        </ButtonGroup>
        <ToggleButtonGroup
          exclusive
          size="small"
          className="activity-view-toggle"
          value={mode}
          onChange={(_, value) => value && setMode(value)}
        >
          <ToggleButton value="list" className="activity-view-toggle-list">
            List
          </ToggleButton>
          <ToggleButton value="calendar">Calendar</ToggleButton>
        </ToggleButtonGroup>
      </div>

      {isLoading ? (
        <>
          <div className="mt-5 d-flex justify-content-center">
            <Spinner />
          </div>
          <div className="mt-2 d-flex justify-content-center">
            Loading Activity...
          </div>
        </>
      ) : mode === "list" ? (
        <ActivityList activity={data?.watch_activity || []} />
      ) : (
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={date}
          onNavigate={setDate}
          toolbar={false}
          view={Views.MONTH}
          views={[Views.MONTH]}
          popup
        />
      )}
    </div>
  );
}
