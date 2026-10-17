import { useState, useEffect } from "react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@raydenui/ui";
import { api, socket } from "../api/client";
import SnapshotImage from "../components/SnapshotImage";
import { useTunnelUrl } from "../api/useTunnelUrl";
import {
  BEHAVIOR_HEX,
  behaviorBadgeColor,
  behaviorLabel,
  formatConfidence,
  isBehavior,
} from "../behavior";

const behaviors = ["All", ...Object.keys(BEHAVIOR_HEX)];

export default function Detections() {
  const [filter, setFilter] = useState("All");
  const [detections, setDetections] = useState([]);
  const tunnelUrl = useTunnelUrl();

  useEffect(() => {
    api
      .get("/detections")
      .then((res) => {
        setDetections(res.data);
      })
      .catch(() => {});

    socket.on("new_detection", (detection) => {
      setDetections((prev) => [detection, ...prev].slice(0, 50));
    });

    return () => {
      socket.off("new_detection");
    };
  }, []);

  const countOf = (b) =>
    b === "All"
      ? detections.length
      : detections.filter((d) => isBehavior(d.behavior, b)).length;

  const filtered =
    filter === "All"
      ? detections
      : detections.filter((d) => isBehavior(d.behavior, filter));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-h4 text-grey-900">Detections</h1>
        <p className="text-body-md text-grey-700 mt-1">
          Behavioral detection log — Objective 2. The model classifies behavior only;
          each detection is saved with a snapshot.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by behavior">
        {behaviors.map((b) => (
          <Button
            key={b}
            size="sm"
            variant={filter === b ? "secondary" : "grey"}
            appearance={filter === b ? "solid" : "outlined"}
            aria-pressed={filter === b}
            onClick={() => setFilter(b)}
            className="h-11"
          >
            {b} ({countOf(b)})
          </Button>
        ))}
      </div>

      <Card shadow="md">
        <CardHeader
          title="Detection log"
          actions={<Badge color="neutral">{filtered.length} records</Badge>}
          bordered
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Snapshot</TableHead>
                <TableHead>Behavior</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Camera</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-grey-500">
                    No detections yet — awaiting YOLO model deployment
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((d, i) => (
                <TableRow key={d.id ?? i}>
                  <TableCell>
                    {d.snapshot ? (
                      <SnapshotImage
                        snapshot={d.snapshot}
                        tunnelUrl={tunnelUrl}
                        alt={`${behaviorLabel(d.behavior)} snapshot`}
                        className="w-40 aspect-video rounded-md"
                        link
                      />
                    ) : (
                      <span className="text-grey-500">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge color={behaviorBadgeColor(d.behavior)} size="sm">
                      {behaviorLabel(d.behavior)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatConfidence(d.confidence)}</TableCell>
                  <TableCell>{d.camera}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(d.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
