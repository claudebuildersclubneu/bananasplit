import { createIcon, seed } from "../create-icon";

/*
 * People and talking to them. A person is a head (r3.5) over rounded
 * shoulders; a modifier (plus, minus, cross, gear) sits to their right.
 */

export const User = /* @__PURE__ */ createIcon(
  "User",
  <>
    <circle cx="12" cy="7.5" r="3.5" />
    <path d="M5 20.5a7 7 0 0 1 14 0" />
  </>,
);
export const Users = /* @__PURE__ */ createIcon(
  "Users",
  <>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0M15.5 4.8a3.3 3.3 0 0 1 0 6.4m2.5 3.4a6.5 6.5 0 0 1 3.5 5.9" />
  </>,
);

const leftPerson = (
  <>
    <circle cx="9.5" cy="7.5" r="3.5" />
    <path d="M2.5 20.5a7 7 0 0 1 14 0" />
  </>
);

export const UserPlus = /* @__PURE__ */ createIcon(
  "UserPlus",
  <>
    {leftPerson}
    <path d="M19 8v6m-3-3h6" />
  </>,
);
export const UserMinus = /* @__PURE__ */ createIcon(
  "UserMinus",
  <>
    {leftPerson}
    <path d="M16 11h6" />
  </>,
);
export const UserX = /* @__PURE__ */ createIcon(
  "UserX",
  <>
    {leftPerson}
    <path d="m16.5 8.5 4.5 4.5m0-4.5L16.5 13" />
  </>,
);
export const UserCog = /* @__PURE__ */ createIcon(
  "UserCog",
  <>
    <circle cx="10" cy="7.5" r="3.5" />
    <path d="M3 20.5a7 7 0 0 1 9.7-6.45" />
    <circle cx="18" cy="18" r="2.25" />
    <path d="M18 14v1.25m0 5.5V22m-4-4h1.25m5.5 0H22" />
  </>,
);
export const Bot = /* @__PURE__ */ createIcon(
  "Bot",
  <>
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 8V5.5M9 13v1.5m6-1.5v1.5M2 13v2.5m20-2.5v2.5" />
    {seed(12, 4)}
  </>,
);
export const Crown = /* @__PURE__ */ createIcon(
  "Crown",
  <path d="M5 17.5 3.5 8l4.8 3.8L12 5l3.7 6.8L20.5 8 19 17.5zm.5 3.5h13" />,
);
export const GraduationCap = /* @__PURE__ */ createIcon(
  "GraduationCap",
  <path d="M2.5 9.5 12 5l9.5 4.5L12 14zm4 2V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5m4-2v5" />,
);
export const Handshake = /* @__PURE__ */ createIcon(
  "Handshake",
  <path d="m11 17.5 1.5 1.5a1.4 1.4 0 0 0 2-2m-1-1.5 2 2a1.4 1.4 0 0 0 2-2l-3.8-3.8a2 2 0 0 0-2.8 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a3.5 3.5 0 0 1 4.3-.5l.5.3a3 3 0 0 0 2.1.4L21 6.5m0 7L17.5 17M3 6.5l1.6.4a3 3 0 0 0 2.1-.3L8 5.9M3 13.5 8.5 19a1.4 1.4 0 0 0 2-2" />,
);

export const Bell = /* @__PURE__ */ createIcon(
  "Bell",
  <path d="M6 15.5V11a6 6 0 1 1 12 0v4.5l1.6 2.1a.9.9 0 0 1-.7 1.4H5.1a.9.9 0 0 1-.7-1.4zm4 6a2.4 2.4 0 0 0 4 0" />,
);

const envelope = <rect x="3" y="5" width="18" height="14" rx="3" />;
const flap = <path d="m3.5 7.5 7.3 5.3a2 2 0 0 0 2.4 0l7.3-5.3" />;

export const Mail = /* @__PURE__ */ createIcon(
  "Mail",
  <>
    {envelope}
    {flap}
  </>,
);
export const MailCheck = /* @__PURE__ */ createIcon(
  "MailCheck",
  <>
    <path d="M21 12.5V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h6.5" />
    {flap}
    <path d="m15.5 18.5 2 2 4-4" />
  </>,
);
export const MailPlus = /* @__PURE__ */ createIcon(
  "MailPlus",
  <>
    <path d="M21 12.5V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h7" />
    {flap}
    <path d="M18.5 15v6m-3-3h6" />
  </>,
);
export const AtSign = /* @__PURE__ */ createIcon(
  "AtSign",
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a2.5 2.5 0 0 0 5 0v-1a9 9 0 1 0-3.5 7.1" />
  </>,
);
export const Inbox = /* @__PURE__ */ createIcon(
  "Inbox",
  <path d="m3 13 2.2-6a2.3 2.3 0 0 1 2.1-1.5h9.4a2.3 2.3 0 0 1 2.1 1.5L21 13v4.5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm0 0h5l1.5 2.5h5L16 13h5" />,
);

const bubble = "M7.5 19.4A8.7 8.7 0 1 0 4.6 16.5l-1.1 4z";
const box = "M20.5 15.5a3 3 0 0 1-3 3H8l-4.5 3v-15a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z";

export const MessageCircle = /* @__PURE__ */ createIcon("MessageCircle", <path d={bubble} />);
export const MessageCircleQuestion = /* @__PURE__ */ createIcon(
  "MessageCircleQuestion",
  <>
    <path d={bubble} />
    <path d="M9.75 9.75a2.25 2.25 0 1 1 3 2.1c-.45.2-.75.6-.75 1.1v.3" />
    {seed(12, 15.75, 1.1)}
  </>,
);
export const MessageSquare = /* @__PURE__ */ createIcon("MessageSquare", <path d={box} />);
export const MessageSquareText = /* @__PURE__ */ createIcon(
  "MessageSquareText",
  <path d={`${box}M8 8.5h8M8 12.5h5`} />,
);
export const MessageSquarePlus = /* @__PURE__ */ createIcon(
  "MessageSquarePlus",
  <path d={`${box}M12 7.5v6m-3-3h6`} />,
);
export const Phone = /* @__PURE__ */ createIcon(
  "Phone",
  <path d="M5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 7 7l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5.5a2 2 0 0 1 2-2z" />,
);
export const Megaphone = /* @__PURE__ */ createIcon(
  "Megaphone",
  <path d="M3.5 10v4a1.5 1.5 0 0 0 1.5 1.5h2L16 20V4L7 8.5H5A1.5 1.5 0 0 0 3.5 10zM7 8.5v7m1 0 1 4.5m10.5-10.5a3 3 0 0 1 0 5" />,
);
export const Share2 = /* @__PURE__ */ createIcon(
  "Share2",
  <>
    <circle cx="17.5" cy="5.5" r="2.5" />
    <circle cx="6.5" cy="12" r="2.5" />
    <circle cx="17.5" cy="18.5" r="2.5" />
    <path d="m8.7 10.7 6.6-3.9m-6.6 6.5 6.6 3.9" />
  </>,
);
export const SmilePlus = /* @__PURE__ */ createIcon(
  "SmilePlus",
  <>
    <path d="M20.8 13.5A9 9 0 1 1 10.5 3.1" />
    <path d="M8.5 14.5c.8 1.2 2 2 3.5 2s2.7-.8 3.5-2M19 2.5v6m-3-3h6" />
    {seed(9, 10, 1.1)}
    {seed(15, 10, 1.1)}
  </>,
);
