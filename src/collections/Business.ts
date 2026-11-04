import type { Access, CollectionConfig } from 'payload'

const isAppUser: Access = ({ req }) => req.user?.collection === 'users'
const appOnly = {
  create: isAppUser,
  read: isAppUser,
  update: isAppUser,
  delete: isAppUser,
}

const paymentMethods = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Card', value: 'card' },
  { label: 'Bank transfer', value: 'bank' },
]

const paymentStatuses = [
  { label: 'Paid', value: 'paid' },
  { label: 'Partially paid', value: 'partial' },
  { label: 'Unpaid', value: 'unpaid' },
]

const money = (name: string, label: string, required = true) =>
  ({
    name,
    label,
    type: 'number',
    required,
    min: 0,
  }) as const

const idFrom = (prefix: string) =>
  `${prefix}-${new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { hidden: true, useAsTitle: 'name' },
  auth: true,
  access: {
    create: () => true,
    read: isAppUser,
    update: ({ req, id }) => req.user?.collection === 'users' && req.user.id === id,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ operation, req }) => {
        if (operation === 'create') {
          const existing = await req.payload.count({
            collection: 'users',
            overrideAccess: true,
          })
          if (existing.totalDocs > 0 && req.user?.collection !== 'users') {
            throw new Error('The owner account is already configured.')
          }
        }
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'owner',
      options: [{ label: 'Owner', value: 'owner' }],
      access: { create: () => false, update: () => false },
    },
  ],
  versions: false,
}

export const Dealers: CollectionConfig = {
  slug: 'dealers',
  admin: { group: 'Sagar Tyres', useAsTitle: 'name' },
  access: appOnly,
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'contactPerson', type: 'text' },
    { name: 'mobile', type: 'text', required: true },
    { name: 'gstin', type: 'text' },
    { name: 'address', type: 'textarea' },
    money('openingBalance', 'Opening balance', false),
    { name: 'notes', type: 'textarea' },
  ],
}

export const Customers: CollectionConfig = {
  slug: 'customers',
  admin: { group: 'Sagar Tyres', useAsTitle: 'name' },
  access: appOnly,
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'mobile', type: 'text', required: true, index: true },
    { name: 'bikeBrand', type: 'text' },
    { name: 'bikeModel', type: 'text' },
    { name: 'registrationNumber', type: 'text' },
    { name: 'notes', type: 'textarea' },
    { name: 'totalSpent', type: 'number', defaultValue: 0, min: 0 },
    { name: 'visits', type: 'number', defaultValue: 0, min: 0 },
    { name: 'lastPurchaseDate', type: 'date' },
  ],
}

export const Products: CollectionConfig = {
  slug: 'products',
  admin: { group: 'Sagar Tyres', useAsTitle: 'model' },
  access: appOnly,
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === 'create' && data && !data.sku) data.sku = idFrom('TYR')
        return data
      },
    ],
  },
  fields: [
    { name: 'sku', type: 'text', required: true, unique: true, index: true },
    { name: 'brand', type: 'text', required: true, index: true },
    { name: 'model', type: 'text', required: true, index: true },
    { name: 'size', type: 'text', required: true, index: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Front', value: 'front' },
        { label: 'Rear', value: 'rear' },
        { label: 'Both', value: 'both' },
      ],
    },
    { name: 'compatibleBikes', type: 'text', hasMany: true },
    {
      name: 'tyreType',
      type: 'select',
      required: true,
      options: [
        { label: 'Tubeless', value: 'tubeless' },
        { label: 'Tube type', value: 'tube' },
      ],
    },
    money('purchasePrice', 'Reference purchase price'),
    money('sellingPrice', 'Default selling price'),
    {
      name: 'currentStock',
      label: 'Quantity in stock',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    { name: 'minimumStock', type: 'number', required: true, defaultValue: 3, min: 0 },
    { name: 'dealer', type: 'relationship', relationTo: 'dealers' },
    { name: 'description', type: 'textarea' },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}

export const Purchases: CollectionConfig = {
  slug: 'purchases',
  admin: { group: 'Transactions', useAsTitle: 'invoiceNumber' },
  access: appOnly,
  fields: [
    { name: 'invoiceNumber', type: 'text', required: true, unique: true, index: true },
    { name: 'dealer', type: 'relationship', relationTo: 'dealers', required: true },
    { name: 'purchasedAt', type: 'date', required: true, index: true },
    {
      name: 'lines',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products', required: true },
        { name: 'quantity', type: 'number', required: true, min: 1 },
        money('unitCost', 'Unit cost'),
        money('lineTotal', 'Line total'),
      ],
    },
    money('additionalCharges', 'Additional charges', false),
    money('discount', 'Discount', false),
    money('finalAmount', 'Final invoice amount'),
    money('amountPaid', 'Amount paid', false),
    { name: 'paymentStatus', type: 'select', required: true, options: paymentStatuses },
    { name: 'paymentMethod', type: 'select', required: true, options: paymentMethods },
    { name: 'notes', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'posted',
      options: [
        { label: 'Posted', value: 'posted' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ],
}

export const StockBatches: CollectionConfig = {
  slug: 'stock-batches',
  admin: { group: 'Inventory', useAsTitle: 'batchCode' },
  access: appOnly,
  fields: [
    { name: 'batchCode', type: 'text', required: true, unique: true },
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true },
    {
      name: 'purchase',
      type: 'relationship',
      relationTo: 'purchases',
      admin: {
        description: 'Empty only for opening stock entered while creating a product.',
      },
    },
    { name: 'purchasedAt', type: 'date', required: true, index: true },
    { name: 'originalQuantity', type: 'number', required: true, min: 1 },
    { name: 'remainingQuantity', type: 'number', required: true, min: 0, index: true },
    money('unitCost', 'Unit cost'),
  ],
}

export const Sales: CollectionConfig = {
  slug: 'sales',
  admin: { group: 'Transactions', useAsTitle: 'invoiceNumber' },
  access: appOnly,
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === 'create' && data && !data.invoiceNumber) data.invoiceNumber = idFrom('ST')
        return data
      },
    ],
  },
  fields: [
    { name: 'invoiceNumber', type: 'text', required: true, unique: true, index: true },
    { name: 'customer', type: 'relationship', relationTo: 'customers' },
    { name: 'customerName', type: 'text', required: true },
    { name: 'customerMobile', type: 'text' },
    { name: 'bikeBrand', type: 'text' },
    { name: 'bikeModel', type: 'text' },
    { name: 'soldAt', type: 'date', required: true, index: true },
    {
      name: 'lines',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products', required: true },
        { name: 'quantity', type: 'number', required: true, min: 1 },
        money('unitPrice', 'Selling price'),
        money('discount', 'Discount', false),
        money('lineTotal', 'Line total'),
        money('cogs', 'FIFO cost'),
        { name: 'profit', type: 'number', required: true },
        { name: 'allocations', type: 'json', required: true },
      ],
    },
    money('subtotal', 'Subtotal'),
    money('discount', 'Discount', false),
    money('finalAmount', 'Final amount'),
    money('cogs', 'Cost of goods sold'),
    { name: 'grossProfit', type: 'number', required: true },
    { name: 'paymentMethod', type: 'select', required: true, options: paymentMethods },
    { name: 'paymentStatus', type: 'select', required: true, options: paymentStatuses },
    { name: 'notes', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'completed',
      options: [
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
  ],
}

export const Expenses: CollectionConfig = {
  slug: 'expenses',
  admin: { group: 'Finance', useAsTitle: 'description' },
  access: appOnly,
  fields: [
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        'rent',
        'electricity',
        'salary',
        'transportation',
        'maintenance',
        'food',
        'miscellaneous',
        'other',
      ].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })),
    },
    { name: 'description', type: 'text', required: true },
    money('amount', 'Amount'),
    { name: 'expenseAt', type: 'date', required: true, index: true },
    { name: 'paymentMethod', type: 'select', required: true, options: paymentMethods },
    { name: 'notes', type: 'textarea' },
  ],
}

export const StockMovements: CollectionConfig = {
  slug: 'stock-movements',
  admin: { group: 'Audit', useAsTitle: 'reference' },
  access: appOnly,
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: ['purchase', 'sale', 'return', 'adjustment', 'cancellation'].map((value) => ({
        label: value[0].toUpperCase() + value.slice(1),
        value,
      })),
    },
    { name: 'quantity', type: 'number', required: true },
    { name: 'reference', type: 'text', required: true },
    { name: 'occurredAt', type: 'date', required: true, index: true },
    { name: 'notes', type: 'textarea' },
  ],
}

export const Returns: CollectionConfig = {
  slug: 'returns',
  admin: { group: 'Transactions', useAsTitle: 'returnNumber' },
  access: appOnly,
  fields: [
    { name: 'returnNumber', type: 'text', required: true, unique: true },
    { name: 'sale', type: 'relationship', relationTo: 'sales', required: true },
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
    { name: 'quantity', type: 'number', required: true, min: 1 },
    { name: 'reason', type: 'textarea', required: true },
    {
      name: 'condition',
      type: 'select',
      required: true,
      options: [
        { label: 'Saleable', value: 'saleable' },
        { label: 'Damaged', value: 'damaged' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending inspection', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    { name: 'returnedAt', type: 'date', required: true },
    { name: 'notes', type: 'textarea' },
  ],
}
