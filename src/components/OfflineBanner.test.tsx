import { act, render, screen } from "@testing-library/react-native";
import { OfflineBanner, bannerText } from "./OfflineBanner";
import { useOnline } from "../offline/connectivity";
import { useQueue } from "../offline/sync";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock("@react-native-community/netinfo", () => ({ addEventListener: jest.fn() }));
jest.mock("../api/expenses", () => ({ createExpense: jest.fn() }));

const item = (key: string, status: "pending" | "failed" = "pending") => ({ key, status, queuedAt: 1, payload: {} as never });
jest.useFakeTimers();
beforeEach(() => { useOnline.setState({ online: true }); useQueue.setState({ items: [] }); });

test("6.3 the words: silent online, calm and specific offline, with the queue count", () => {
  expect(bannerText(true, 0, false)).toBeNull();
  expect(bannerText(false, 0, false)).toBe("You're offline. Showing last synced data.");
  expect(bannerText(false, 1, false)).toMatch(/1 expense will sync/);
  expect(bannerText(false, 3, false)).toMatch(/3 expenses will sync/);
  expect(bannerText(true, 0, true)).toBe("All synced");
});

test("6.3 nothing is shown while online", async () => {
  await render(<OfflineBanner />);
  expect(screen.queryByText(/offline/)).toBeNull();
});

test("6.3 going offline shows the indicator, and it stays until the connection returns", async () => {
  await render(<OfflineBanner />);
  await act(async () => { useOnline.setState({ online: false }); });
  expect(screen.getByText(/You're offline. Showing last synced data./)).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(screen.getByText(/You're offline/)).toBeTruthy();
  await act(async () => { useOnline.setState({ online: true }); });
  expect(screen.queryByText(/offline/)).toBeNull();
});

test("6.3 offline with queued expenses says how many are waiting; failed ones are not counted as waiting", async () => {
  useOnline.setState({ online: false });
  useQueue.setState({ items: [item("a"), item("b"), item("c", "failed")] });
  await render(<OfflineBanner />);
  expect(screen.getByText(/2 expenses will sync/)).toBeTruthy();
});

test("6.3 once queued work has synced it says so briefly, then goes quiet", async () => {
  useQueue.setState({ items: [item("a")] });
  await render(<OfflineBanner />);
  await act(async () => { useQueue.setState({ items: [] }); });
  expect(screen.getByText(/All synced/)).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(screen.queryByText(/All synced/)).toBeNull();
});

test("6.3 the app stays usable: the banner is a passive strip with no controls", async () => {
  useOnline.setState({ online: false });
  await render(<OfflineBanner />);
  expect(screen.queryByRole("button")).toBeNull();
});
