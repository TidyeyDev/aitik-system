import { useState } from "react";
import { Badge, Card, CardBody, CardHeader, MetricsCard } from "@raydenui/ui";
import { clockIcon, eyeIcon, targetIcon } from "@raydenui/ui/icons";

// Photos go in frontend/public/team/. A missing file falls back to initials.
const ADVISER = {
  name: "RIO CAMILLE M. PEDROCILLO, ECE",
  role: "Research Adviser",
  src: "/team/pedrocillo.jpg",
};

const MEMBERS = [
  {
    name: "Rhitch Aisha N. Asunción",
    role: "Project Leader",
    src: "/team/asuncion.jpg",
  },
  { name: "Kimberly DC. Anievas", role: "Member", src: "/team/anievas.jpg" },
  {
    name: "Angel Valerie F. Ceñidoza",
    role: "Member",
    src: "/team/cenidoza.jpg",
  },
  { name: "Jebsus Mayria L. Co", role: "Member", src: "/team/co.jpg" },
  { name: "Nicholo Adrian A. Lauzon", role: "Member", src: "/team/lauzon.jpg" },
];

const STATS = [
  { label: "Model Accuracy (mAP@50)", value: "82.7%", icon: targetIcon },
  { label: "Behavior Classes Detected", value: "4", icon: eyeIcon },
  { label: "Continuous Monitoring", value: "24/7", icon: clockIcon },
];

// First + last name initial, skipping middle initials and the ", ECE" suffix.
function initials(name) {
  const words = name
    .replace(/,.*$/, "")
    .split(/\s+/)
    .filter((w) => !w.endsWith("."));
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function Avatar({ name, src, size = "size-24" }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        className={`${size} rounded-full object-cover ring-4 ring-grey-100`}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`${size} rounded-full bg-grey-200 ring-4 ring-grey-100 flex items-center justify-center font-heading text-h5 text-grey-600`}
    >
      {initials(name)}
    </div>
  );
}

function MemberCard({ name, role, src, highlight }) {
  return (
    <Card
      shadow="md"
      className={highlight ? "border-2 border-success-500" : ""}
    >
      <CardBody className="p-6 flex flex-col items-center text-center gap-3">
        <Avatar
          name={name}
          src={src}
          size={highlight ? "size-28" : "size-24"}
        />
        <div className="font-heading text-h6 text-grey-900">{name}</div>
        <Badge color={highlight ? "success" : "neutral"} size="sm">
          {role}
        </Badge>
      </CardBody>
    </Card>
  );
}

export default function AboutUs() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="text-center py-4 sm:py-6">
        <div className="text-6xl" aria-hidden="true">
          🦆
        </div>
        <h1 className="font-heading text-h2 text-grey-900 mt-3">
          AI-<span className="text-success-600">TIK</span>
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-body-lg text-grey-600">
          AI-TIK: AI System Identification for Reproductive Receptivity of
          Philippine Mallard Ducks (Anas platyrhynchos) Based on Behavioral
          Patterns
        </p>
      </header>

      <Card shadow="md">
        <CardHeader title="About AI-TIK" bordered />
        <CardBody className="p-6 text-body-md text-grey-700 space-y-3">
          <p>
            AI-TIK watches a flock of Philippine Mallard ducks through farm
            cameras and uses a YOLO object detection model to recognize
            reproductive behaviors as they happen.
          </p>
          <p>
            Each detection is logged with a snapshot, so farmers can see which
            ducks are receptive, track mating activity over time, and connect
            behavior to egg quality records.
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {STATS.map((s) => (
          <MetricsCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
          />
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="font-heading text-h4 text-grey-900">Our Team</h2>
        <div className="max-w-sm mx-auto">
          <MemberCard {...ADVISER} highlight />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {MEMBERS.map((m) => (
            <MemberCard key={m.name} {...m} />
          ))}
        </div>
      </section>

      <footer className="text-center text-body-sm text-grey-500 pt-4 pb-2 border-t border-grey-200">
        University of Rizal System — Morong Campus, College of Engineering
      </footer>
    </div>
  );
}
