'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createContactAction,
  createExpenseAction,
  createProductAction,
  createPurchaseAction,
  createSaleAction,
  deleteRecordAction,
  logoutAction,
  type ActionState,
  updateRecordAction,
} from '../actions'

type Doc = Record<string, any> & { id: string }
type Data = {
  products: Doc[]
  dealers: Doc[]
  customers: Doc[]
  purchases: Doc[]
  sales: Doc[]
  expenses: Doc[]
}
type Section =
  | 'dashboard'
  | 'inventory'
  | 'purchases'
  | 'sales'
  | 'customers'
  | 'dealers'
  | 'expenses'
  | 'reports'
  | 'settings'
type Modal = 'product' | 'purchase' | 'sale' | 'customer' | 'dealer' | 'expense' | null
type EditableCollection = 'products' | 'dealers' | 'customers' | 'purchases' | 'sales' | 'expenses'
type EditTarget = { collection: EditableCollection; doc: Doc }

const nav: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'inventory', label: 'Inventory', icon: 'box' },
  { id: 'purchases', label: 'Purchases', icon: 'truck' },
  { id: 'sales', label: 'Sales', icon: 'receipt' },
  { id: 'customers', label: 'Customers', icon: 'users' },
  { id: 'dealers', label: 'Dealers', icon: 'store' },
  { id: 'expenses', label: 'Expenses', icon: 'wallet' },
  { id: 'reports', label: 'Reports & Analytics', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
})
const initialState: ActionState = { ok: false, message: '' }
const relation = (value: any) => (typeof value === 'object' && value ? value : null)
const relationID = (value: any) => String(relation(value)?.id ?? value ?? '')

export function SagarApp({ userName, initialData }: { userName: string; initialData: Data }) {
  const router = useRouter()
  const [section, setSection] = useState<Section>('dashboard')
  const [modal, setModal] = useState<Modal>(null)
  const [editing, setEditing] = useState<EditTarget | null>(null)
  const [deletingID, setDeletingID] = useState<string | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [range, setRange] = useState('today')
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<Doc | null>(null)

  const filtered = useMemo(() => filterByRange(initialData, range), [initialData, range])
  const title = nav.find((item) => item.id === section)?.label ?? 'Dashboard'
  const edit = (collection: EditableCollection, doc: Doc) => setEditing({ collection, doc })
  const remove = async (collection: EditableCollection, doc: Doc, label: string) => {
    if (!window.confirm(`Permanently delete ${label}? This cannot be undone.`)) return
    setDeletingID(String(doc.id))
    const result = await deleteRecordAction(collection, String(doc.id))
    setDeletingID(null)
    window.alert(result.message)
    if (result.ok) router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#172033]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[264px] bg-[#111d32] text-white transition-transform lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="grid size-10 place-items-center rounded-xl bg-[#ed8b2d]">
            <Icon name="tyre" className="size-6" />
          </div>
          <div>
            <p className="font-bold tracking-tight">Sagar Tyres</p>
            <p className="text-[11px] text-slate-400">Business Manager</p>
          </div>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSection(item.id)
                setMobileNav(false)
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                section === item.id
                  ? 'bg-[#ed8b2d] text-white shadow-lg shadow-black/15'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon name={item.icon} className="size-[19px]" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="grid size-9 place-items-center rounded-full bg-[#2b3b55] text-sm font-bold">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="text-[11px] text-slate-400">Owner account</p>
            </div>
            <form action={logoutAction}>
              <button title="Sign out" className="text-slate-400 hover:text-white">
                <Icon name="logout" className="size-5" />
              </button>
            </form>
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileNav(true)}
            >
              <Icon name="menu" className="size-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
              <p className="hidden text-xs text-slate-400 sm:block">Sagar Tyres · Asia/Kolkata</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setModal('sale')}
              className="flex items-center gap-2 rounded-xl bg-[#ed8b2d] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#da791e]"
            >
              <Icon name="plus" className="size-4" />
              <span className="hidden sm:inline">Record Sale</span>
            </button>
            <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500">
              <Icon name="bell" className="size-5" />
              {lowStock(initialData.products).length > 0 && (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-7">
          {section === 'dashboard' && (
            <Dashboard
              data={filtered}
              allData={initialData}
              range={range}
              setRange={setRange}
              setModal={setModal}
              setSection={setSection}
            />
          )}
          {section === 'inventory' && (
            <Inventory
              products={initialData.products}
              search={search}
              setSearch={setSearch}
              setModal={setModal}
              onEdit={(doc: Doc) => edit('products', doc)}
              onDelete={(doc: Doc) => remove('products', doc, `${doc.brand} ${doc.model}`)}
              deletingID={deletingID}
            />
          )}
          {section === 'purchases' && (
            <Purchases
              data={initialData}
              setModal={setModal}
              onEdit={(doc: Doc) => edit('purchases', doc)}
              onDelete={(doc: Doc) => remove('purchases', doc, doc.invoiceNumber)}
              deletingID={deletingID}
            />
          )}
          {section === 'sales' && (
            <Sales
              data={initialData}
              setModal={setModal}
              selectSale={setSelectedSale}
              onEdit={(doc: Doc) => edit('sales', doc)}
              onDelete={(doc: Doc) => remove('sales', doc, doc.invoiceNumber)}
              deletingID={deletingID}
            />
          )}
          {section === 'customers' && (
            <Contacts
              kind="customer"
              docs={initialData.customers}
              sales={initialData.sales}
              setModal={setModal}
              onEdit={(doc: Doc) => edit('customers', doc)}
              onDelete={(doc: Doc) => remove('customers', doc, doc.name)}
              deletingID={deletingID}
            />
          )}
          {section === 'dealers' && (
            <Contacts
              kind="dealer"
              docs={initialData.dealers}
              purchases={initialData.purchases}
              setModal={setModal}
              onEdit={(doc: Doc) => edit('dealers', doc)}
              onDelete={(doc: Doc) => remove('dealers', doc, doc.name)}
              deletingID={deletingID}
            />
          )}
          {section === 'expenses' && (
            <Expenses
              expenses={initialData.expenses}
              setModal={setModal}
              onEdit={(doc: Doc) => edit('expenses', doc)}
              onDelete={(doc: Doc) => remove('expenses', doc, doc.description)}
              deletingID={deletingID}
            />
          )}
          {section === 'reports' && <Reports data={filtered} range={range} setRange={setRange} />}
          {section === 'settings' && <Settings />}
        </main>
      </div>
      {modal && <EntryModal kind={modal} data={initialData} close={() => setModal(null)} />}
      {editing && <EditModal target={editing} close={() => setEditing(null)} />}
      {selectedSale && <Invoice sale={selectedSale} close={() => setSelectedSale(null)} />}
    </div>
  )
}

function Dashboard({ data, allData, range, setRange, setModal, setSection }: any) {
  const metrics = getMetrics(data)
  const low = lowStock(allData.products)
  const topBrands = groupSales(data.sales, 'brand').slice(0, 5)
  const maxBrand = Math.max(1, ...topBrands.map((item) => item.value))
  const chart = lastSevenDays(allData.sales, allData.expenses)
  const maxChart = Math.max(1, ...chart.map((d) => d.sales))
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold">Business overview</h2>
          <p className="mt-1 text-sm text-slate-500">
            Live figures calculated from your transaction records.
          </p>
        </div>
        <DateFilter value={range} onChange={setRange} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total sales"
          value={inr.format(metrics.revenue)}
          change={`${metrics.tyres} tyres sold`}
          icon="rupee"
          tone="orange"
        />
        <Metric
          label="Gross profit"
          value={inr.format(metrics.grossProfit)}
          change={`${metrics.margin.toFixed(1)}% margin`}
          icon="trend"
          tone="green"
        />
        <Metric
          label="Total expenses"
          value={inr.format(metrics.expenses)}
          change="Operating costs"
          icon="wallet"
          tone="red"
        />
        <Metric
          label="Net profit"
          value={inr.format(metrics.netProfit)}
          change={`${metrics.customers} customers served`}
          icon="chart"
          tone="blue"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetric
          label="Tyres in stock"
          value={String(
            allData.products.reduce((s: number, p: Doc) => s + (p.currentStock || 0), 0),
          )}
          icon="box"
        />
        <MiniMetric
          label="Inventory value"
          value={inr.format(
            allData.products.reduce(
              (s: number, p: Doc) => s + (p.currentStock || 0) * (p.purchasePrice || 0),
              0,
            ),
          )}
          icon="layers"
        />
        <MiniMetric label="Low stock alerts" value={String(low.length)} icon="alert" warn />
        <MiniMetric
          label="Cash / UPI"
          value={`${inr.format(metrics.cash)} / ${inr.format(metrics.upi)}`}
          icon="payments"
        />
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold">Quick actions</h3>
            <p className="text-sm text-slate-400">Run your shop with fewer clicks</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Quick label="Add Purchase" icon="truck" onClick={() => setModal('purchase')} />
          <Quick label="Record Sale" icon="receipt" primary onClick={() => setModal('sale')} />
          <Quick label="Add Customer" icon="userplus" onClick={() => setModal('customer')} />
          <Quick label="Add Expense" icon="wallet" onClick={() => setModal('expense')} />
          <Quick label="View Reports" icon="chart" onClick={() => setSection('reports')} />
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Sales performance</h3>
              <p className="text-sm text-slate-400">Last 7 days · revenue and profit</p>
            </div>
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              Live data
            </span>
          </div>
          <div className="mt-8 flex h-56 items-end gap-3 sm:gap-5">
            {chart.map((day) => (
              <div key={day.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div className="relative flex flex-1 items-end justify-center gap-1 rounded-t-lg bg-slate-50 px-1">
                  <div
                    title={`Sales ${inr.format(day.sales)}`}
                    className="w-2/5 rounded-t-md bg-[#ed8b2d]"
                    style={{ height: `${Math.max(3, (day.sales / maxChart) * 100)}%` }}
                  />
                  <div
                    title={`Profit ${inr.format(day.profit)}`}
                    className="w-2/5 rounded-t-md bg-[#203653]"
                    style={{ height: `${Math.max(3, (day.profit / maxChart) * 100)}%` }}
                  />
                </div>
                <p className="text-center text-[11px] text-slate-400">{day.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <i className="size-2 rounded-full bg-[#ed8b2d]" />
              Sales
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2 rounded-full bg-[#203653]" />
              Profit
            </span>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold">Top-selling brands</h3>
          <p className="text-sm text-slate-400">By quantity in selected period</p>
          <div className="mt-6 space-y-5">
            {topBrands.length ? (
              topBrands.map((brand, index) => (
                <div key={brand.label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">
                      {index + 1}. {brand.label}
                    </span>
                    <span className="text-slate-500">{brand.value} tyres</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#ed8b2d]"
                      style={{ width: `${(brand.value / maxBrand) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <Empty compact text="No sales recorded in this period." />
            )}
          </div>
        </section>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h3 className="font-bold">Stock alerts</h3>
              <p className="text-sm text-slate-400">{low.length} items need attention</p>
            </div>
            <button
              onClick={() => setSection('inventory')}
              className="text-sm font-semibold text-[#d96f0f]"
            >
              View inventory
            </button>
          </div>
          {low.length ? (
            <div className="divide-y divide-slate-100">
              {low.slice(0, 5).map((p: Doc) => (
                <div key={p.id} className="flex items-center gap-4 p-4">
                  <div
                    className={`grid size-10 place-items-center rounded-xl ${p.currentStock === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}
                  >
                    <Icon name="alert" className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {p.brand} {p.model}
                    </p>
                    <p className="text-xs text-slate-400">
                      {p.size} · {p.tyreType}
                    </p>
                  </div>
                  <StockBadge stock={p.currentStock} min={p.minimumStock} />
                </div>
              ))}
            </div>
          ) : (
            <Empty compact text="All products are sufficiently stocked." />
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h3 className="font-bold">Recent sales</h3>
            <p className="text-sm text-slate-400">Latest customer transactions</p>
          </div>
          {allData.sales.length ? (
            <div className="divide-y divide-slate-100">
              {allData.sales.slice(0, 5).map((sale: Doc) => (
                <div key={sale.id} className="flex items-center gap-4 p-4">
                  <div className="grid size-10 place-items-center rounded-full bg-slate-100 text-xs font-bold">
                    {(sale.customerName || 'W').slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{sale.customerName}</p>
                    <p className="text-xs text-slate-400">
                      {sale.invoiceNumber} · {dateFmt.format(new Date(sale.soldAt))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{inr.format(sale.finalAmount)}</p>
                    <p className="text-xs text-emerald-600">
                      +{inr.format(sale.grossProfit)} profit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty compact text="Your recent sales will appear here." />
          )}
        </section>
      </div>
    </div>
  )
}

function Inventory({ products, search, setSearch, setModal, onEdit, onDelete, deletingID }: any) {
  const shown = products.filter((p: Doc) =>
    `${p.sku} ${p.brand} ${p.model} ${p.size} ${(p.compatibleBikes || []).join(' ')}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  return (
    <PageCard
      title="Tyre inventory"
      subtitle={`${products.length} products · ${products.reduce((s: number, p: Doc) => s + p.currentStock, 0)} units in stock`}
      action={
        <button onClick={() => setModal('product')} className="primary-btn">
          <Icon name="plus" className="size-4" />
          Add product
        </button>
      }
    >
      <div className="border-b border-slate-100 p-4">
        <Search
          value={search}
          setValue={setSearch}
          placeholder="Search by SKU, brand, model, size or compatible bike…"
        />
      </div>
      <Table headers={['Product', 'Size / Type', 'Purchase', 'Selling', 'Stock', 'Status']}>
        {shown.map((p: Doc) => (
          <tr key={p.id} className="table-row">
            <td>
              <p className="font-semibold">
                {p.brand} {p.model}
              </p>
              <p className="text-xs text-slate-400">{p.sku}</p>
              <div className="mt-2">
                <RecordActions
                  onEdit={() => onEdit(p)}
                  onDelete={() => onDelete(p)}
                  deleting={deletingID === String(p.id)}
                />
              </div>
            </td>
            <td>
              <p>{p.size}</p>
              <p className="text-xs capitalize text-slate-400">
                {p.tyreType} · {p.category}
              </p>
            </td>
            <td>{inr.format(p.purchasePrice)}</td>
            <td className="font-semibold">{inr.format(p.sellingPrice)}</td>
            <td>
              <strong>{p.currentStock}</strong>{' '}
              <span className="text-xs text-slate-400">units</span>
            </td>
            <td>
              <StockBadge stock={p.currentStock} min={p.minimumStock} />
            </td>
          </tr>
        ))}
      </Table>
      {!shown.length && <Empty text="No tyres match your search." />}
    </PageCard>
  )
}

function Purchases({ data, setModal, onEdit, onDelete, deletingID }: any) {
  const outstanding = data.purchases.reduce(
    (sum: number, p: Doc) => sum + Math.max(0, p.finalAmount - (p.amountPaid || 0)),
    0,
  )
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Total purchases"
          value={inr.format(data.purchases.reduce((s: number, p: Doc) => s + p.finalAmount, 0))}
          change={`${data.purchases.length} invoices`}
          icon="truck"
          tone="blue"
        />
        <Metric
          label="Outstanding"
          value={inr.format(outstanding)}
          change="Dealer payments due"
          icon="alert"
          tone="red"
        />
        <Metric
          label="Units purchased"
          value={String(
            data.purchases
              .flatMap((p: Doc) => p.lines || [])
              .reduce((s: number, l: Doc) => s + l.quantity, 0),
          )}
          change="Across all invoices"
          icon="box"
          tone="green"
        />
      </div>
      <PageCard
        title="Purchase history"
        subtitle="Dealer invoices and payment status"
        action={
          <button onClick={() => setModal('purchase')} className="primary-btn">
            <Icon name="plus" className="size-4" />
            Add purchase
          </button>
        }
      >
        <Table headers={['Invoice', 'Dealer', 'Date', 'Items', 'Amount', 'Payment']}>
          {data.purchases.map((p: Doc) => (
            <tr key={p.id} className="table-row">
              <td>
                <p className="font-semibold">{p.invoiceNumber}</p>
                <div className="mt-2">
                  <RecordActions
                    onEdit={() => onEdit(p)}
                    onDelete={() => onDelete(p)}
                    deleting={deletingID === String(p.id)}
                  />
                </div>
              </td>
              <td>{relation(p.dealer)?.name || 'Dealer'}</td>
              <td>{dateFmt.format(new Date(p.purchasedAt))}</td>
              <td>{(p.lines || []).reduce((s: number, l: Doc) => s + l.quantity, 0)} tyres</td>
              <td className="font-semibold">{inr.format(p.finalAmount)}</td>
              <td>
                <Status value={p.paymentStatus} />
              </td>
            </tr>
          ))}
        </Table>
        {!data.purchases.length && (
          <Empty text="No dealer purchases yet. Add your first invoice to increase stock." />
        )}
      </PageCard>
    </div>
  )
}

function Sales({ data, setModal, selectSale, onEdit, onDelete, deletingID }: any) {
  const metrics = getMetrics(data)
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Sales revenue"
          value={inr.format(metrics.revenue)}
          change={`${metrics.tyres} tyres sold`}
          icon="rupee"
          tone="orange"
        />
        <Metric
          label="FIFO cost"
          value={inr.format(metrics.cogs)}
          change="Actual cost of stock sold"
          icon="layers"
          tone="blue"
        />
        <Metric
          label="Gross profit"
          value={inr.format(metrics.grossProfit)}
          change={`${metrics.margin.toFixed(1)}% margin`}
          icon="trend"
          tone="green"
        />
      </div>
      <PageCard
        title="Sales history"
        subtitle="Click any invoice to view or print the customer bill"
        action={
          <button onClick={() => setModal('sale')} className="primary-btn">
            <Icon name="plus" className="size-4" />
            Record sale
          </button>
        }
      >
        <Table headers={['Invoice', 'Customer', 'Date', 'Tyres', 'Payment', 'Amount / Profit']}>
          {data.sales.map((s: Doc) => (
            <tr
              key={s.id}
              onClick={() => selectSale(s)}
              className="table-row cursor-pointer hover:bg-orange-50/40"
            >
              <td>
                <p className="font-semibold text-[#d96f0f]">{s.invoiceNumber}</p>
                <div className="mt-2" onClick={(event) => event.stopPropagation()}>
                  <RecordActions
                    onEdit={() => onEdit(s)}
                    onDelete={() => onDelete(s)}
                    deleting={deletingID === String(s.id)}
                  />
                </div>
              </td>
              <td>
                <p className="font-medium">{s.customerName}</p>
                <p className="text-xs text-slate-400">{s.customerMobile || 'No mobile'}</p>
              </td>
              <td>{dateFmt.format(new Date(s.soldAt))}</td>
              <td>{(s.lines || []).reduce((n: number, l: Doc) => n + l.quantity, 0)}</td>
              <td>
                <Status value={s.paymentMethod} />
              </td>
              <td>
                <p className="font-semibold">{inr.format(s.finalAmount)}</p>
                <p className="text-xs text-emerald-600">+{inr.format(s.grossProfit)}</p>
              </td>
            </tr>
          ))}
        </Table>
        {!data.sales.length && (
          <Empty text="No sales recorded yet. Use Record Sale for a fast checkout." />
        )}
      </PageCard>
    </div>
  )
}

function Contacts({
  kind,
  docs,
  sales = [],
  purchases = [],
  setModal,
  onEdit,
  onDelete,
  deletingID,
}: any) {
  return (
    <PageCard
      title={kind === 'customer' ? 'Customer CRM' : 'Dealer directory'}
      subtitle={
        kind === 'customer'
          ? 'Customer vehicles, visits and purchase history'
          : 'Suppliers, purchases and outstanding balances'
      }
      action={
        <button onClick={() => setModal(kind)} className="primary-btn">
          <Icon name="plus" className="size-4" />
          Add {kind}
        </button>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {docs.map((doc: Doc) => {
          const relatedSales = sales.filter(
            (sale: Doc) => relationID(sale.customer) === String(doc.id),
          )
          const relatedPurchases = purchases.filter(
            (purchase: Doc) => relationID(purchase.dealer) === String(doc.id),
          )
          const spent =
            kind === 'customer'
              ? doc.totalSpent || relatedSales.reduce((s: number, x: Doc) => s + x.finalAmount, 0)
              : relatedPurchases.reduce((s: number, x: Doc) => s + x.finalAmount, 0)
          return (
            <article
              key={doc.id}
              className="rounded-2xl border border-slate-200 p-5 transition hover:border-orange-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-[#fff1e5] font-bold text-[#d96f0f]">
                  {doc.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{doc.name}</h3>
                  <p className="text-sm text-slate-500">{doc.mobile}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400">
                    {kind === 'customer' ? 'Total spent' : 'Purchased'}
                  </p>
                  <p className="mt-1 font-bold">{inr.format(spent)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">
                    {kind === 'customer' ? 'Visits' : 'Invoices'}
                  </p>
                  <p className="mt-1 font-bold">
                    {kind === 'customer'
                      ? doc.visits || relatedSales.length
                      : relatedPurchases.length}
                  </p>
                </div>
              </div>
              {kind === 'customer' && (
                <p className="mt-4 text-xs text-slate-500">
                  {[doc.bikeBrand, doc.bikeModel, doc.registrationNumber]
                    .filter(Boolean)
                    .join(' · ') || 'Vehicle details not added'}
                </p>
              )}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <RecordActions
                  onEdit={() => onEdit(doc)}
                  onDelete={() => onDelete(doc)}
                  deleting={deletingID === String(doc.id)}
                />
              </div>
            </article>
          )
        })}
      </div>
      {!docs.length && <Empty text={`No ${kind}s added yet.`} />}
    </PageCard>
  )
}

function Expenses({ expenses, setModal, onEdit, onDelete, deletingID }: any) {
  const grouped: Record<string, number> = expenses.reduce(
    (acc: Record<string, number>, e: Doc) => ({
      ...acc,
      [e.category]: (acc[e.category] || 0) + e.amount,
    }),
    {} as Record<string, number>,
  )
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Total expenses"
          value={inr.format(expenses.reduce((s: number, e: Doc) => s + e.amount, 0))}
          change={`${expenses.length} entries`}
          icon="wallet"
          tone="red"
        />
        {Object.entries(grouped)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([label, value], i) => (
            <Metric
              key={label}
              label={label[0].toUpperCase() + label.slice(1)}
              value={inr.format(value)}
              change={i ? 'Second largest category' : 'Largest category'}
              icon="chart"
              tone="blue"
            />
          ))}
      </div>
      <PageCard
        title="Expense ledger"
        subtitle="Daily operating costs, separate from stock purchases"
        action={
          <button onClick={() => setModal('expense')} className="primary-btn">
            <Icon name="plus" className="size-4" />
            Add expense
          </button>
        }
      >
        <Table headers={['Date', 'Category', 'Description', 'Method', 'Amount']}>
          {expenses.map((e: Doc) => (
            <tr key={e.id} className="table-row">
              <td>{dateFmt.format(new Date(e.expenseAt))}</td>
              <td>
                <Status value={e.category} />
              </td>
              <td>
                <p className="font-medium">{e.description}</p>
                <div className="mt-2">
                  <RecordActions
                    onEdit={() => onEdit(e)}
                    onDelete={() => onDelete(e)}
                    deleting={deletingID === String(e.id)}
                  />
                </div>
              </td>
              <td className="capitalize">{e.paymentMethod}</td>
              <td className="font-bold">{inr.format(e.amount)}</td>
            </tr>
          ))}
        </Table>
        {!expenses.length && <Empty text="No expenses recorded yet." />}
      </PageCard>
    </div>
  )
}

function Reports({ data, range, setRange }: any) {
  const metrics = getMetrics(data)
  const brands = groupSales(data.sales, 'brand')
  const sizes = groupSales(data.sales, 'size')
  const exportCSV = () => {
    const rows = [
      ['Invoice', 'Date', 'Customer', 'Revenue', 'COGS', 'Gross Profit', 'Payment'],
      ...data.sales.map((s: Doc) => [
        s.invoiceNumber,
        s.soldAt,
        s.customerName,
        s.finalAmount,
        s.cogs,
        s.grossProfit,
        s.paymentMethod,
      ]),
    ]
    downloadCSV('sagar-tyres-sales-report.csv', rows)
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold">Reports & analytics</h2>
          <p className="text-sm text-slate-500">
            Financial performance using FIFO cost of goods sold.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DateFilter value={range} onChange={setRange} />
          <button onClick={exportCSV} className="secondary-btn">
            <Icon name="download" className="size-4" />
            Excel / CSV
          </button>
          <button onClick={() => window.print()} className="secondary-btn">
            <Icon name="print" className="size-4" />
            PDF / Print
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Revenue"
          value={inr.format(metrics.revenue)}
          change="Completed sales"
          icon="rupee"
          tone="orange"
        />
        <Metric
          label="Cost of goods sold"
          value={inr.format(metrics.cogs)}
          change="FIFO actual cost"
          icon="layers"
          tone="blue"
        />
        <Metric
          label="Operating expenses"
          value={inr.format(metrics.expenses)}
          change="Excludes purchases"
          icon="wallet"
          tone="red"
        />
        <Metric
          label="Net operating profit"
          value={inr.format(metrics.netProfit)}
          change="Gross profit less expenses"
          icon="trend"
          tone="green"
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Breakdown title="Brand-wise sales" items={brands} />
        <Breakdown title="Size-wise sales" items={sizes} />
      </div>
      <PageCard title="Profit & loss statement" subtitle="Unsold stock remains an inventory asset">
        <div className="p-5">
          <ReportRow label="Sales revenue" value={metrics.revenue} />
          <ReportRow label="Less: Cost of goods sold (FIFO)" value={-metrics.cogs} />
          <ReportRow label="Gross profit" value={metrics.grossProfit} strong />
          <ReportRow label="Less: Operating expenses" value={-metrics.expenses} />
          <ReportRow label="Net operating profit" value={metrics.netProfit} strong final />
        </div>
      </PageCard>
    </div>
  )
}

function Settings() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <PageCard title="Business settings" subtitle="Configured for accurate local operations">
        <div className="divide-y divide-slate-100 p-2">
          <Setting label="Business name" value="Sagar Tyres" />
          <Setting label="Currency" value="Indian Rupee (₹)" />
          <Setting label="Timezone" value="Asia/Kolkata" />
          <Setting label="Inventory costing" value="FIFO – First In, First Out" />
        </div>
      </PageCard>
      <PageCard title="Data & backup" subtitle="Keep a portable copy of your business records">
        <div className="p-5">
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <Icon name="database" className="size-7 text-[#d96f0f]" />
            <h3 className="mt-3 font-bold">Database export</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Use Reports to export transaction-level CSV files. Full database administration and
              media are available in the secure Payload admin.
            </p>
            <a href="/admin" className="secondary-btn mt-4 inline-flex">
              Open database admin
            </a>
          </div>
        </div>
      </PageCard>
    </div>
  )
}

function EditModal({ target, close }: { target: EditTarget; close: () => void }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(updateRecordAction, initialState)
  useEffect(() => {
    if (state.ok) {
      router.refresh()
      const timer = setTimeout(close, 500)
      return () => clearTimeout(timer)
    }
  }, [state.ok, router, close])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0d1728]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) close()
      }}
    >
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
          <div>
            <h2 className="text-xl font-bold">Edit record</h2>
            <p className="text-sm text-slate-400">Changes are applied directly to this record.</p>
          </div>
          <button
            onClick={close}
            className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <Icon name="x" className="size-5" />
          </button>
        </div>
        <form action={action} className="p-5 sm:p-7">
          <input type="hidden" name="collection" value={target.collection} />
          <input type="hidden" name="recordID" value={target.doc.id} />
          <EditFields collection={target.collection} doc={target.doc} />
          {state.message && (
            <p
              className={`mt-5 rounded-xl px-4 py-3 text-sm ${state.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
            >
              {state.message}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={close} className="secondary-btn">
              Cancel
            </button>
            <button disabled={pending} className="primary-btn">
              {pending ? 'Updating…' : 'Update record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditFields({ collection, doc }: { collection: EditableCollection; doc: Doc }) {
  if (collection === 'products') {
    return (
      <div className="form-grid">
        <FormField label="Brand *" name="brand" defaultValue={doc.brand} required />
        <FormField label="Model *" name="model" defaultValue={doc.model} required />
        <FormField label="Tyre size *" name="size" defaultValue={doc.size} required />
        <EditSelect
          label="Position *"
          name="category"
          defaultValue={doc.category}
          options={[
            ['front', 'Front'],
            ['rear', 'Rear'],
            ['both', 'Both'],
          ]}
        />
        <EditSelect
          label="Tyre type *"
          name="tyreType"
          defaultValue={doc.tyreType}
          options={[
            ['tubeless', 'Tubeless'],
            ['tube', 'Tube type'],
          ]}
        />
        <FormField
          label="Compatible bikes"
          name="compatibleBikes"
          defaultValue={(doc.compatibleBikes || []).join(', ')}
        />
        <FormField
          label="Purchase price *"
          name="purchasePrice"
          type="number"
          min="0"
          defaultValue={doc.purchasePrice}
          required
        />
        <FormField
          label="Selling price *"
          name="sellingPrice"
          type="number"
          min="0"
          defaultValue={doc.sellingPrice}
          required
        />
        <FormField
          label="Current stock *"
          name="currentStock"
          type="number"
          min="0"
          defaultValue={doc.currentStock}
          required
        />
        <FormField
          label="Low-stock alert at *"
          name="minimumStock"
          type="number"
          min="0"
          defaultValue={doc.minimumStock}
          required
        />
        <FormField
          className="sm:col-span-2"
          label="Description"
          name="description"
          defaultValue={doc.description || ''}
        />
      </div>
    )
  }

  if (collection === 'dealers') {
    return (
      <div className="form-grid">
        <FormField label="Dealer name *" name="name" defaultValue={doc.name} required />
        <FormField label="Mobile number *" name="mobile" defaultValue={doc.mobile} required />
        <FormField
          label="Contact person"
          name="contactPerson"
          defaultValue={doc.contactPerson || ''}
        />
        <FormField label="GSTIN" name="gstin" defaultValue={doc.gstin || ''} />
        <FormField label="Address" name="address" defaultValue={doc.address || ''} />
        <FormField
          label="Opening balance"
          name="openingBalance"
          type="number"
          min="0"
          defaultValue={doc.openingBalance || 0}
        />
        <FormField
          className="sm:col-span-2"
          label="Notes"
          name="notes"
          defaultValue={doc.notes || ''}
        />
      </div>
    )
  }

  if (collection === 'customers') {
    return (
      <div className="form-grid">
        <FormField label="Customer name *" name="name" defaultValue={doc.name} required />
        <FormField label="Mobile number *" name="mobile" defaultValue={doc.mobile} required />
        <FormField label="Bike brand" name="bikeBrand" defaultValue={doc.bikeBrand || ''} />
        <FormField label="Bike model" name="bikeModel" defaultValue={doc.bikeModel || ''} />
        <FormField
          label="Registration number"
          name="registrationNumber"
          defaultValue={doc.registrationNumber || ''}
        />
        <FormField
          label="Total spent"
          name="totalSpent"
          type="number"
          min="0"
          defaultValue={doc.totalSpent || 0}
        />
        <FormField
          label="Visits"
          name="visits"
          type="number"
          min="0"
          defaultValue={doc.visits || 0}
        />
        <FormField
          className="sm:col-span-2"
          label="Notes"
          name="notes"
          defaultValue={doc.notes || ''}
        />
      </div>
    )
  }

  if (collection === 'purchases') {
    return (
      <div className="form-grid">
        <FormField
          label="Invoice number *"
          name="invoiceNumber"
          defaultValue={doc.invoiceNumber}
          required
        />
        <FormField
          label="Purchase date *"
          name="purchasedAt"
          type="datetime-local"
          defaultValue={dateTimeInput(doc.purchasedAt)}
          required
        />
        <FormField
          label="Additional charges"
          name="additionalCharges"
          type="number"
          min="0"
          defaultValue={doc.additionalCharges || 0}
        />
        <FormField
          label="Discount"
          name="discount"
          type="number"
          min="0"
          defaultValue={doc.discount || 0}
        />
        <FormField
          label="Final amount *"
          name="finalAmount"
          type="number"
          min="0"
          defaultValue={doc.finalAmount}
          required
        />
        <FormField
          label="Amount paid"
          name="amountPaid"
          type="number"
          min="0"
          defaultValue={doc.amountPaid || 0}
        />
        <EditSelect
          label="Payment status *"
          name="paymentStatus"
          defaultValue={doc.paymentStatus}
          options={statusOptions}
        />
        <EditSelect
          label="Payment method *"
          name="paymentMethod"
          defaultValue={doc.paymentMethod}
          options={paymentOptions}
        />
        <EditSelect
          label="Record status *"
          name="status"
          defaultValue={doc.status}
          options={[
            ['posted', 'Posted'],
            ['cancelled', 'Cancelled'],
          ]}
        />
        <FormField label="Notes" name="notes" defaultValue={doc.notes || ''} />
      </div>
    )
  }

  if (collection === 'sales') {
    return (
      <div className="form-grid">
        <FormField
          label="Invoice number *"
          name="invoiceNumber"
          defaultValue={doc.invoiceNumber}
          required
        />
        <FormField
          label="Sale date *"
          name="soldAt"
          type="datetime-local"
          defaultValue={dateTimeInput(doc.soldAt)}
          required
        />
        <FormField
          label="Customer name *"
          name="customerName"
          defaultValue={doc.customerName}
          required
        />
        <FormField
          label="Customer mobile"
          name="customerMobile"
          defaultValue={doc.customerMobile || ''}
        />
        <FormField label="Bike brand" name="bikeBrand" defaultValue={doc.bikeBrand || ''} />
        <FormField label="Bike model" name="bikeModel" defaultValue={doc.bikeModel || ''} />
        <FormField
          label="Subtotal"
          name="subtotal"
          type="number"
          min="0"
          defaultValue={doc.subtotal}
        />
        <FormField
          label="Discount"
          name="discount"
          type="number"
          min="0"
          defaultValue={doc.discount || 0}
        />
        <FormField
          label="Final amount"
          name="finalAmount"
          type="number"
          min="0"
          defaultValue={doc.finalAmount}
        />
        <FormField label="FIFO cost" name="cogs" type="number" min="0" defaultValue={doc.cogs} />
        <FormField
          label="Gross profit"
          name="grossProfit"
          type="number"
          defaultValue={doc.grossProfit}
        />
        <EditSelect
          label="Payment method *"
          name="paymentMethod"
          defaultValue={doc.paymentMethod}
          options={paymentOptions}
        />
        <EditSelect
          label="Payment status *"
          name="paymentStatus"
          defaultValue={doc.paymentStatus}
          options={statusOptions}
        />
        <EditSelect
          label="Record status *"
          name="status"
          defaultValue={doc.status}
          options={[
            ['completed', 'Completed'],
            ['cancelled', 'Cancelled'],
            ['refunded', 'Refunded'],
          ]}
        />
        <FormField
          className="sm:col-span-2"
          label="Notes"
          name="notes"
          defaultValue={doc.notes || ''}
        />
      </div>
    )
  }

  return (
    <div className="form-grid">
      <EditSelect
        label="Category *"
        name="category"
        defaultValue={doc.category}
        options={expenseOptions}
      />
      <FormField
        label="Amount *"
        name="amount"
        type="number"
        min="0"
        defaultValue={doc.amount}
        required
      />
      <FormField
        className="sm:col-span-2"
        label="Description *"
        name="description"
        defaultValue={doc.description}
        required
      />
      <FormField
        label="Date & time *"
        name="expenseAt"
        type="datetime-local"
        defaultValue={dateTimeInput(doc.expenseAt)}
        required
      />
      <EditSelect
        label="Payment method *"
        name="paymentMethod"
        defaultValue={doc.paymentMethod}
        options={paymentOptions}
      />
      <FormField
        className="sm:col-span-2"
        label="Notes"
        name="notes"
        defaultValue={doc.notes || ''}
      />
    </div>
  )
}

function EntryModal({
  kind,
  data,
  close,
}: {
  kind: Exclude<Modal, null>
  data: Data
  close: () => void
}) {
  const router = useRouter()
  const configs: Record<string, { title: string; action: any }> = {
    product: { title: 'Add tyre product', action: createProductAction },
    purchase: { title: 'Add dealer purchase', action: createPurchaseAction },
    sale: { title: 'Record customer sale', action: createSaleAction },
    customer: { title: 'Add customer', action: createContactAction },
    dealer: { title: 'Add dealer', action: createContactAction },
    expense: { title: 'Record expense', action: createExpenseAction },
  }
  const [state, action, pending] = useActionState(configs[kind].action, initialState)
  useEffect(() => {
    if (state.ok) {
      router.refresh()
      const timer = setTimeout(close, 650)
      return () => clearTimeout(timer)
    }
  }, [state.ok, router, close])
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0d1728]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) close()
      }}
    >
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
          <div>
            <h2 className="text-xl font-bold">{configs[kind].title}</h2>
            <p className="text-sm text-slate-400">Fields marked * are required</p>
          </div>
          <button
            onClick={close}
            className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <Icon name="x" className="size-5" />
          </button>
        </div>
        <form action={action} className="p-5 sm:p-7">
          {kind === 'product' && <ProductForm />}
          {(kind === 'customer' || kind === 'dealer') && <ContactForm kind={kind} />}
          {kind === 'expense' && <ExpenseForm />}
          {kind === 'purchase' && <PurchaseForm data={data} />}
          {kind === 'sale' && <SaleForm data={data} />}
          {state.message && (
            <p
              className={`mt-5 rounded-xl px-4 py-3 text-sm ${state.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
            >
              {state.message}
              {state.invoice ? ` Invoice ${state.invoice} is ready.` : ''}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={close} className="secondary-btn">
              Cancel
            </button>
            <button disabled={pending} className="primary-btn">
              {pending ? 'Saving…' : kind === 'sale' ? 'Complete sale' : 'Save record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProductForm() {
  return (
    <div className="form-grid">
      <FormField label="Brand *" name="brand" placeholder="MRF" required />
      <FormField label="Model / product name *" name="model" placeholder="Zapper" required />
      <FormField label="Tyre size *" name="size" placeholder="90/90-12" required />
      <SelectField
        label="Position *"
        name="category"
        options={[
          ['front', 'Front'],
          ['rear', 'Rear'],
          ['both', 'Both'],
        ]}
      />
      <SelectField
        label="Tyre type *"
        name="tyreType"
        options={[
          ['tubeless', 'Tubeless'],
          ['tube', 'Tube type'],
        ]}
      />
      <FormField
        label="Compatible bikes"
        name="compatibleBikes"
        placeholder="Honda Activa, TVS Jupiter"
      />
      <FormField
        label="Reference purchase price *"
        name="purchasePrice"
        type="number"
        min="0"
        required
      />
      <FormField
        label="Default selling price *"
        name="sellingPrice"
        type="number"
        min="0"
        required
      />
      <FormField
        label="Opening quantity *"
        name="openingQuantity"
        type="number"
        min="0"
        step="1"
        defaultValue="0"
        required
      />
      <FormField
        label="Low-stock alert at *"
        name="minimumStock"
        type="number"
        min="0"
        defaultValue="3"
        required
      />
      <FormField
        className="sm:col-span-2"
        label="Description"
        name="description"
        placeholder="Pattern, warranty or fitment notes"
      />
    </div>
  )
}
function ContactForm({ kind }: { kind: string }) {
  return (
    <div className="form-grid">
      <input type="hidden" name="kind" value={kind} />
      <FormField
        label={`${kind === 'dealer' ? 'Dealer' : 'Customer'} name *`}
        name="name"
        required
      />
      <FormField label="Mobile number *" name="mobile" inputMode="tel" required />
      {kind === 'dealer' ? (
        <FormField label="Contact person" name="contactPerson" />
      ) : (
        <>
          <FormField label="Bike brand" name="bikeBrand" placeholder="Honda" />
          <FormField label="Bike model" name="bikeModel" placeholder="Activa 6G" />
          <FormField
            label="Registration number"
            name="registrationNumber"
            placeholder="GJ 01 AB 1234"
          />
        </>
      )}
      <FormField className="sm:col-span-2" label="Notes" name="notes" />
    </div>
  )
}
function ExpenseForm() {
  return (
    <div className="form-grid">
      <SelectField
        label="Category *"
        name="category"
        options={[
          'rent',
          'electricity',
          'salary',
          'transportation',
          'maintenance',
          'food',
          'miscellaneous',
          'other',
        ].map((v) => [v, v[0].toUpperCase() + v.slice(1)])}
      />
      <FormField label="Amount *" name="amount" type="number" min="1" required />
      <FormField className="sm:col-span-2" label="Description *" name="description" required />
      <FormField label="Date & time" name="expenseAt" type="datetime-local" />
      <SelectField label="Payment method *" name="paymentMethod" options={paymentOptions} />
      <FormField className="sm:col-span-2" label="Notes" name="notes" />
    </div>
  )
}
function PurchaseForm({ data }: { data: Data }) {
  const [lines, setLines] = useState([{ product: '', quantity: 1, unitCost: 0 }])
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)
  return (
    <div className="space-y-6">
      <div className="form-grid">
        <FormField label="Dealer invoice number *" name="invoiceNumber" required />
        <SelectField
          label="Dealer *"
          name="dealer"
          options={data.dealers.map((d) => [String(d.id), d.name])}
          empty="Select dealer"
        />
        <FormField label="Purchase date & time" name="purchasedAt" type="datetime-local" />
        <SelectField label="Payment method *" name="paymentMethod" options={paymentOptions} />
        <SelectField label="Payment status *" name="paymentStatus" options={statusOptions} />
        <FormField label="Amount paid" name="amountPaid" type="number" min="0" defaultValue="0" />
      </div>
      <LineEditor mode="purchase" lines={lines} setLines={setLines} products={data.products} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div className="form-grid">
        <FormField
          label="Additional charges"
          name="additionalCharges"
          type="number"
          min="0"
          defaultValue="0"
        />
        <FormField label="Discount" name="discount" type="number" min="0" defaultValue="0" />
        <FormField className="sm:col-span-2" label="Notes" name="notes" />
      </div>
      <div className="rounded-xl bg-slate-50 p-4 text-right">
        <p className="text-sm text-slate-500">Tyre subtotal</p>
        <p className="text-2xl font-bold">{inr.format(subtotal)}</p>
      </div>
    </div>
  )
}
function SaleForm({ data }: { data: Data }) {
  const [customer, setCustomer] = useState('')
  const chosen = data.customers.find((c) => String(c.id) === customer)
  const [lines, setLines] = useState([{ product: '', quantity: 1, unitPrice: 0, discount: 0 }])
  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice - l.discount, 0)
  return (
    <div className="space-y-6">
      <div className="form-grid">
        <label className="field">
          <span>Existing customer</span>
          <select name="customer" value={customer} onChange={(e) => setCustomer(e.target.value)}>
            <option value="">Walk-in customer</option>
            {data.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.mobile}
              </option>
            ))}
          </select>
        </label>
        <FormField
          label="Customer name *"
          name="customerName"
          defaultValue={chosen?.name || ''}
          key={`n-${customer}`}
          required
        />
        <FormField
          label="Mobile number"
          name="customerMobile"
          defaultValue={chosen?.mobile || ''}
          key={`m-${customer}`}
        />
        <FormField
          label="Bike brand"
          name="bikeBrand"
          defaultValue={chosen?.bikeBrand || ''}
          key={`b-${customer}`}
        />
        <FormField
          label="Bike model"
          name="bikeModel"
          defaultValue={chosen?.bikeModel || ''}
          key={`bm-${customer}`}
        />
        <SelectField label="Payment method *" name="paymentMethod" options={paymentOptions} />
      </div>
      <LineEditor
        mode="sale"
        lines={lines}
        setLines={setLines}
        products={data.products.filter((p) => p.currentStock > 0)}
      />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div className="form-grid">
        <FormField
          label="Overall discount"
          name="discount"
          type="number"
          min="0"
          defaultValue="0"
        />
        <SelectField label="Payment status *" name="paymentStatus" options={statusOptions} />
        <FormField className="sm:col-span-2" label="Notes" name="notes" />
      </div>
      <div className="flex items-center justify-between rounded-xl bg-[#111d32] p-5 text-white">
        <div>
          <p className="text-sm text-slate-300">Invoice total before overall discount</p>
          <p className="mt-1 text-2xl font-bold">{inr.format(Math.max(0, total))}</p>
        </div>
        <Icon name="receipt" className="size-8 text-[#ed8b2d]" />
      </div>
    </div>
  )
}

function LineEditor({ mode, lines, setLines, products }: any) {
  const update = (index: number, key: string, value: any) =>
    setLines(lines.map((line: any, i: number) => (i === index ? { ...line, [key]: value } : line)))
  const choose = (index: number, productID: string) => {
    const p = products.find((x: Doc) => String(x.id) === productID)
    update(index, 'product', productID)
    if (p)
      setLines(
        lines.map((line: any, i: number) =>
          i === index
            ? {
                ...line,
                product: productID,
                [mode === 'sale' ? 'unitPrice' : 'unitCost']:
                  mode === 'sale' ? p.sellingPrice : p.purchasePrice,
              }
            : line,
        ),
      )
  }
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold">Tyre line items</h3>
          <p className="text-xs text-slate-400">Add multiple products to one invoice</p>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            setLines([
              ...lines,
              mode === 'sale'
                ? { product: '', quantity: 1, unitPrice: 0, discount: 0 }
                : { product: '', quantity: 1, unitCost: 0 },
            ])
          }
        >
          <Icon name="plus" className="size-4" />
          Add line
        </button>
      </div>
      <div className="space-y-3">
        {lines.map((line: any, index: number) => {
          const p = products.find((x: Doc) => String(x.id) === line.product)
          return (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[1fr_90px_120px_36px]"
            >
              <label className="field">
                <span>Tyre *</span>
                <select
                  value={line.product}
                  onChange={(e) => choose(index, e.target.value)}
                  required
                >
                  <option value="">Search / select product</option>
                  {products.map((product: Doc) => (
                    <option key={product.id} value={product.id}>
                      {product.brand} {product.model} · {product.size}{' '}
                      {mode === 'sale' ? `(${product.currentStock} available)` : ''}
                    </option>
                  ))}
                </select>
                {p && (
                  <small>
                    {p.tyreType} · {p.category}
                    {mode === 'sale' ? ` · Stock ${p.currentStock}` : ''}
                  </small>
                )}
              </label>
              <label className="field">
                <span>Quantity *</span>
                <input
                  type="number"
                  min="1"
                  max={mode === 'sale' ? p?.currentStock : undefined}
                  value={line.quantity}
                  onChange={(e) => update(index, 'quantity', Number(e.target.value))}
                />
              </label>
              <label className="field">
                <span>{mode === 'sale' ? 'Sell price' : 'Unit cost'} *</span>
                <input
                  type="number"
                  min="0"
                  value={line[mode === 'sale' ? 'unitPrice' : 'unitCost']}
                  onChange={(e) =>
                    update(
                      index,
                      mode === 'sale' ? 'unitPrice' : 'unitCost',
                      Number(e.target.value),
                    )
                  }
                />
              </label>
              <button
                type="button"
                aria-label="Remove line"
                disabled={lines.length === 1}
                onClick={() => setLines(lines.filter((_: any, i: number) => i !== index))}
                className="mt-6 grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
              >
                <Icon name="trash" className="size-4" />
              </button>
              {mode === 'sale' && (
                <label className="field sm:col-span-3">
                  <span>Line discount</span>
                  <input
                    type="number"
                    min="0"
                    value={line.discount}
                    onChange={(e) => update(index, 'discount', Number(e.target.value))}
                  />
                </label>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Invoice({ sale, close }: { sale: Doc; close: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0d1728]/65 p-3 backdrop-blur-sm sm:p-8">
      <div className="invoice mx-auto max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="no-print flex items-center justify-between border-b p-4">
          <button onClick={close} className="secondary-btn">
            <Icon name="x" className="size-4" />
            Close
          </button>
          <button onClick={() => window.print()} className="primary-btn">
            <Icon name="print" className="size-4" />
            Print bill
          </button>
        </div>
        <div className="p-7 sm:p-10">
          <div className="flex items-start justify-between border-b-2 border-[#111d32] pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-[#ed8b2d] text-white">
                  <Icon name="tyre" className="size-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#111d32]">SAGAR TYRES</h2>
                  <p className="text-xs text-slate-500">Motorcycle & Scooter Tyres</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-[#d96f0f]">
                Tax Invoice
              </p>
              <p className="mt-2 font-mono text-sm">{sale.invoiceNumber}</p>
              <p className="text-xs text-slate-500">{dateFmt.format(new Date(sale.soldAt))}</p>
            </div>
          </div>
          <div className="my-6 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="invoice-label">Billed to</p>
              <p className="font-bold">{sale.customerName}</p>
              <p className="text-sm text-slate-500">
                {sale.customerMobile || 'Mobile not provided'}
              </p>
            </div>
            <div>
              <p className="invoice-label">Vehicle</p>
              <p className="font-semibold">
                {[sale.bikeBrand, sale.bikeModel].filter(Boolean).join(' ') || 'Not specified'}
              </p>
              <p className="text-sm capitalize text-slate-500">
                Payment: {sale.paymentMethod} · {sale.paymentStatus}
              </p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3">Tyre</th>
                <th className="py-3 text-center">Qty</th>
                <th className="py-3 text-right">Rate</th>
                <th className="py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(sale.lines || []).map((line: Doc, i: number) => {
                const p = relation(line.product)
                return (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-4">
                      <p className="font-semibold">
                        {p ? `${p.brand} ${p.model}` : 'Tyre product'}
                      </p>
                      <p className="text-xs text-slate-400">{p?.size || ''}</p>
                    </td>
                    <td className="text-center">{line.quantity}</td>
                    <td className="text-right">{inr.format(line.unitPrice)}</td>
                    <td className="text-right font-semibold">{inr.format(line.lineTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{inr.format(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Discount</span>
              <span>- {inr.format(sale.discount)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-[#111d32] pt-3 text-lg font-black">
              <span>Total</span>
              <span>{inr.format(sale.finalAmount)}</span>
            </div>
          </div>
          <div className="mt-10 border-t border-dashed border-slate-300 pt-5 text-center">
            <p className="font-semibold">Thank you for choosing Sagar Tyres</p>
            <p className="mt-1 text-xs text-slate-400">
              Please retain this bill for warranty and service reference.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function getMetrics(data: Partial<Data>) {
  const sales = (data.sales || []).filter((s) => s.status !== 'cancelled')
  const revenue = sales.reduce((s, x) => s + (x.finalAmount || 0), 0)
  const cogs = sales.reduce((s, x) => s + (x.cogs || 0), 0)
  const grossProfit = revenue - cogs
  const expenses = (data.expenses || []).reduce((s, x) => s + (x.amount || 0), 0)
  return {
    revenue,
    cogs,
    grossProfit,
    expenses,
    netProfit: grossProfit - expenses,
    margin: revenue ? (grossProfit / revenue) * 100 : 0,
    tyres: sales.flatMap((x) => x.lines || []).reduce((s, x) => s + x.quantity, 0),
    customers: new Set(sales.map((x) => x.customerMobile || x.customerName)).size,
    cash: sales.filter((x) => x.paymentMethod === 'cash').reduce((s, x) => s + x.finalAmount, 0),
    upi: sales.filter((x) => x.paymentMethod === 'upi').reduce((s, x) => s + x.finalAmount, 0),
  }
}
function filterByRange(data: Data, range: string): Data {
  const end = new Date()
  const start = new Date()
  if (range === 'today') start.setHours(0, 0, 0, 0)
  else if (range === 'yesterday') {
    start.setDate(start.getDate() - 1)
    start.setHours(0, 0, 0, 0)
    end.setDate(end.getDate() - 1)
    end.setHours(23, 59, 59, 999)
  } else if (range === 'week') {
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)
    start.setHours(0, 0, 0, 0)
  } else if (range === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  } else if (range === 'previous') {
    start.setMonth(start.getMonth() - 1, 1)
    start.setHours(0, 0, 0, 0)
    end.setDate(0)
    end.setHours(23, 59, 59, 999)
  } else start.setFullYear(2000)
  const inside = (value: string) => {
    const d = new Date(value)
    return d >= start && d <= end
  }
  return {
    ...data,
    sales: data.sales.filter((x) => inside(x.soldAt)),
    purchases: data.purchases.filter((x) => inside(x.purchasedAt)),
    expenses: data.expenses.filter((x) => inside(x.expenseAt)),
  }
}
function lowStock(products: Doc[]) {
  return products.filter((p) => p.currentStock <= p.minimumStock)
}
function groupSales(sales: Doc[], key: 'brand' | 'size') {
  const map: Record<string, number> = {}
  for (const sale of sales)
    for (const line of sale.lines || []) {
      const p = relation(line.product)
      const label = p?.[key] || 'Unknown'
      map[label] = (map[label] || 0) + line.quantity
    }
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}
function lastSevenDays(sales: Doc[], expenses: Doc[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const daySales = sales.filter(
      (s) => new Date(s.soldAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === key,
    )
    const revenue = daySales.reduce((n, s) => n + s.finalAmount, 0)
    const profit =
      daySales.reduce((n, s) => n + s.grossProfit, 0) -
      expenses
        .filter(
          (e) =>
            new Date(e.expenseAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === key,
        )
        .reduce((n, e) => n + e.amount, 0)
    return {
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      sales: revenue,
      profit: Math.max(0, profit),
    }
  })
}
function downloadCSV(name: string, rows: any[][]) {
  const csv = rows
    .map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

const paymentOptions = [
  ['cash', 'Cash'],
  ['upi', 'UPI'],
  ['card', 'Card'],
  ['bank', 'Bank transfer'],
]
const statusOptions = [
  ['paid', 'Paid'],
  ['partial', 'Partially paid'],
  ['unpaid', 'Unpaid'],
]
const expenseOptions = [
  ['rent', 'Rent'],
  ['electricity', 'Electricity'],
  ['salary', 'Salary'],
  ['transportation', 'Transportation'],
  ['maintenance', 'Maintenance'],
  ['food', 'Food'],
  ['miscellaneous', 'Miscellaneous'],
  ['other', 'Other'],
]
function dateTimeInput(value: string) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}
function DateFilter({ value, onChange }: any) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-[#ed8b2d]"
    >
      <option value="today">Today</option>
      <option value="yesterday">Yesterday</option>
      <option value="week">This week</option>
      <option value="month">This month</option>
      <option value="previous">Previous month</option>
      <option value="all">All time</option>
    </select>
  )
}
function Metric({ label, value, change, icon, tone }: any) {
  const tones: any = {
    orange: 'bg-orange-50 text-[#d96f0f]',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  }
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-slate-400">{change}</p>
        </div>
        <div className={`grid size-11 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon name={icon} className="size-5" />
        </div>
      </div>
    </article>
  )
}
function MiniMetric({ label, value, icon, warn }: any) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`grid size-10 place-items-center rounded-xl ${warn ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}
      >
        <Icon name={icon} className="size-5" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-1 font-bold">{value}</p>
      </div>
    </article>
  )
}
function Quick({ label, icon, primary, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-md ${primary ? 'border-[#ed8b2d] bg-[#fff8f1] text-[#c8650d]' : 'border-slate-200 bg-white hover:border-orange-200'}`}
    >
      <span
        className={`grid size-9 place-items-center rounded-lg ${primary ? 'bg-[#ed8b2d] text-white' : 'bg-slate-100 text-slate-600'}`}
      >
        <Icon name={icon} className="size-4" />
      </span>
      {label}
    </button>
  )
}
function PageCard({ title, subtitle, action, children }: any) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
function Table({ headers, children }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            {headers.map((h: string) => (
              <th key={h} className="px-5 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
function Search({ value, setValue, placeholder }: any) {
  return (
    <label className="relative block max-w-xl">
      <Icon
        name="search"
        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#ed8b2d] focus:ring-4 focus:ring-orange-50"
      />
    </label>
  )
}
function Empty({ text, compact }: any) {
  return (
    <div className={`${compact ? 'p-7' : 'p-14'} text-center`}>
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Icon name="box" className="size-5" />
      </div>
      <p className="mt-3 text-sm text-slate-500">{text}</p>
    </div>
  )
}
function StockBadge({ stock, min }: any) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stock === 0 ? 'bg-red-50 text-red-700' : stock <= min ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
    >
      {stock === 0 ? 'Out of stock' : stock <= min ? 'Low stock' : 'In stock'}
    </span>
  )
}
function Status({ value }: any) {
  const danger = ['unpaid', 'cancelled']
  const warn = ['partial', 'pending']
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${danger.includes(value) ? 'bg-red-50 text-red-700' : warn.includes(value) ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
    >
      {String(value).replace('_', ' ')}
    </span>
  )
}
function RecordActions({
  onEdit,
  onDelete,
  deleting,
}: {
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        title="Edit"
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
      >
        <Icon name="edit" className="size-4" />
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        title="Delete permanently"
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
      >
        <Icon name="trash" className="size-4" />
        {deleting ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  )
}
function FormField({ label, className = '', ...props }: any) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <input {...props} />
    </label>
  )
}
function SelectField({ label, name, options, empty }: any) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} required>
        <option value="">{empty || 'Select option'}</option>
        {options.map(([value, text]: string[]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}
function EditSelect({ label, name, options, defaultValue }: any) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} required>
        {options.map(([value, text]: string[]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}
function Breakdown({ title, items }: any) {
  const max = Math.max(1, ...items.map((i: any) => i.value))
  return (
    <PageCard title={title} subtitle="Quantity sold in selected period">
      <div className="space-y-4 p-5">
        {items.slice(0, 8).map((item: any) => (
          <div key={item.label}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span>{item.value} tyres</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#ed8b2d]"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {!items.length && <Empty compact text="No report data in this period." />}
      </div>
    </PageCard>
  )
}
function ReportRow({ label, value, strong, final }: any) {
  return (
    <div
      className={`flex justify-between py-3 ${final ? 'mt-2 border-t-2 border-[#111d32] text-lg' : ''} ${strong ? 'font-bold' : ''}`}
    >
      <span>{label}</span>
      <span className={value < 0 ? 'text-red-600' : value > 0 && strong ? 'text-emerald-700' : ''}>
        {value < 0 ? '- ' : ''}
        {inr.format(Math.abs(value))}
      </span>
    </div>
  )
}
function Setting({ label, value }: any) {
  return (
    <div className="flex justify-between gap-5 rounded-xl p-4 hover:bg-slate-50">
      <span className="text-sm text-slate-500">{label}</span>
      <strong className="text-right text-sm">{value}</strong>
    </div>
  )
}

function Icon({ name, className = 'size-5' }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    box: (
      <>
        <path d="m21 8-9 5-9-5 9-5 9 5Z" />
        <path d="m3 8 9 5 9-5v9l-9 5-9-5V8Z" />
        <path d="M12 13v9" />
      </>
    ),
    truck: (
      <>
        <path d="M3 6h11v10H3z" />
        <path d="M14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    store: (
      <>
        <path d="M3 10v11h18V10M2 10l2-7h16l2 7" />
        <path d="M2 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <path d="M16 12h5M3 8h14" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9m6 10V5m6 14v-7m5 7H2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    tyre: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4v5m8 3h-5m-3 8v-5m-8-3h5" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    plus: <path d="M12 5v14M5 12h14" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    rupee: (
      <>
        <path d="M7 5h10M7 9h10M7 5c7 0 7 8 0 8l9 7" />
      </>
    ),
    trend: <path d="m3 17 6-6 4 4 8-9M15 6h6v6" />,
    layers: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4m0 4h.01" />
      </>
    ),
    payments: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h2" />
      </>
    ),
    userplus: (
      <>
        <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8" cy="7" r="4" />
        <path d="M19 8v6m3-3h-6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7M10 11v6m4-6v6" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    print: (
      <>
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v7H6z" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
      </>
    ),
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current`}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name] || paths.box}
    </svg>
  )
}
