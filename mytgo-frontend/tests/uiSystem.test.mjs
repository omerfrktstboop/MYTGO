import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  AdminDashboard,
  Button,
  ThemeProvider,
  ThemeToggle,
  VehicleListSkeleton,
} from "../src/ui/system.js";

test("Button renders loading and disabled states together", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      Button,
      { loading: true, disabled: false, type: "button" },
      "Kaydet",
    ),
  );

  assert.match(html, /disabled/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Kaydet/);
});

test("ThemeToggle renders inside the ThemeProvider", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(ThemeToggle, null),
    ),
  );

  assert.match(html, /Tema değiştir/);
  assert.match(html, /Sistem/);
});

test("VehicleListSkeleton renders multiple loading rows", () => {
  const html = renderToStaticMarkup(React.createElement(VehicleListSkeleton, { rows: 2 }));

  assert.match(html, /animate-pulse/);
  assert.match(html, /h-12 w-12/);
  assert.match(html, /w-3\/4/);
});

test("AdminDashboard loading state renders skeleton dashboard copy", () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminDashboard, {
      loading: true,
      appointments: [],
      valetRequests: [],
      vehicles: [],
      users: [],
      report: null,
    }),
  );

  assert.match(html, /Yönetici Paneli hazırlanıyor/);
  assert.match(html, /kurumsal placeholder görünüm/);
});
