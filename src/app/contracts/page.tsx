import Link from "next/link";
import { PAYMENT_TYPE_LABELS } from "@/lib/labels";
import { listContracts } from "@/lib/queries";
import ContractForm from "../components/ContractForm";
import PageShell from "../components/PageShell";
import StatusBadge from "../components/StatusBadge";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["进行中", "待确认完结", "已完结"];

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const { search, status } = await searchParams;
  const contracts = await listContracts({ search, status });

  return (
    <PageShell
      title="合同管理"
      subtitle={`共 ${contracts.length} 个合同`}
      actions={<ContractForm />}
    >
      <form
        method="get"
        action="/contracts"
        className="mb-4 flex flex-wrap items-center gap-3"
      >
        <input
          name="search"
          defaultValue={search ?? ""}
          placeholder="搜索合同号 / 客户名称"
          className="w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">全部状态</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          搜索
        </button>
        {(search || status) && (
          <Link
            href="/contracts"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            重置
          </Link>
        )}
      </form>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">合同号</th>
              <th className="px-4 py-3 font-medium">客户</th>
              <th className="px-4 py-3 font-medium">国家</th>
              <th className="px-4 py-3 font-medium">付款方式</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 text-center font-medium">产品数</th>
              <th className="px-4 py-3 text-center font-medium">待办</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {contracts.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-400 dark:text-gray-500"
                >
                  暂无合同
                </td>
              </tr>
            ) : (
              contracts.map((c) => (
                <tr
                  key={c.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/contracts/${c.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {c.contractNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {c.customerName}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {c.customerCountry}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {PAYMENT_TYPE_LABELS[c.paymentType] ?? c.paymentType}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                    {c.itemCount}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.activeTaskCount > 0 ? (
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {c.activeTaskCount}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">
                        0
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
