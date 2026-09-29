import { act, render, screen } from "@testing-library/react-native";
import { ScrollView } from "react-native";
import { usePullToRefresh } from "./usePullToRefresh";

function Screen({ load }: { load: () => Promise<void> }) {
  return <ScrollView testID="list" refreshControl={usePullToRefresh(load)} />;
}

test("pull to refresh reloads once and stops refreshing when the load settles, even if it fails", async () => {
  const load = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
  await render(<Screen load={load} />);
  const control = () => screen.getByTestId("list").props.refreshControl;
  await act(async () => { await control().props.onRefresh().catch(() => {}); });
  expect(load).toHaveBeenCalledTimes(1);
  expect(control().props.refreshing).toBe(false);
});
