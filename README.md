# TestAssignment

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.19.

## Overview

An Angular 19 application demonstrating reliable session presence tracking across multiple browser tabs and devices using Supabase Auth and Realtime.

## Presence Strategy

### Three-State Model (Active, Idle, Stale)

Instead of binary online/offline, this app uses three states to prevent flickering and provide realistic presence:

- **Active**: Tab visible + heartbeat within 15 seconds
- **Idle**: Background tab or 15-60 seconds since last heartbeat
- **Stale**: No heartbeat for 60+ seconds (closed/crashed)

### Why This Approach?

1. **Reliable**: No `beforeunload` events (unreliable in modern browsers). Presence determined purely by heartbeat timestamps.
2. **Flicker-Free**: Time-based transitions with different intervals for active (5s) vs background tabs (30s).
3. **Browser-Friendly**: Tolerates throttling, network delays, and mobile browser behavior.

### Implementation

- Device ID in `localStorage`, Tab ID in `sessionStorage`
- Heartbeats update `lastSeen` timestamp and `isActive` flag
- State recomputed every 2 seconds using Angular signals
- Supabase Realtime for cross-tab/device synchronization

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
