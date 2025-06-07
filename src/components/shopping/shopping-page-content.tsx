'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  Search,
  Filter,
  List,
  Grid,
  DollarSign,
  MapPin,
  Users,
  Minus
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ShoppingItem {
  id: string
  title: string
  description?: string | null
  status: string | null
  priority: string | null
  created_at: string
  quantity?: number
  price?: number
  store?: string
  category?: string
  notes?: string
}

interface Supplement {
  id: string
  name: string
  quantity_servings?: number | null
  servings_per_day?: number | null
  daysLeft?: number | null
  runOutDate?: Date | null
  status: 'good' | 'low' | 'warning' | 'critical' | 'no-data'
}

interface ShoppingPageContentProps {
  user: any
  shoppingTasks: any[]
  supplements: Supplement[]
  categoryId: string
}

const itemCategories = [
  { name: 'Produce', icon: '🥬', color: '#10b981' },
  { name: 'Dairy', icon: '🥛', color: '#3b82f6' },
  { name: 'Meat', icon: '🥩', color: '#ef4444' },
  { name: 'Pantry', icon: '🥫', color: '#f59e0b' },
  { name: 'Snacks', icon: '🍿', color: '#8b5cf6' },
  { name: 'Household', icon: '🧽', color: '#6b7280' },
  { name: 'Personal Care', icon: '🧴', color: '#ec4899' },
  { name: 'Other', icon: '📦', color: '#64748b' }
]

const commonStores = [
  'Grocery Store', 'Target', 'Walmart', 'Costco', 'Amazon', 'Pharmacy', 'Hardware Store', 'Other'
]

export function ShoppingPageContent({ user, shoppingTasks, supplements, categoryId }: ShoppingPageContentProps) {
  const [items, setItems] = useState<ShoppingItem[]>(
    shoppingTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      created_at: task.created_at,
      quantity: 1,
      price: 0,
      store: '',
      category: 'Other',
      notes: ''
    }))
  )
  
  const [supplementsList, setSupplementsList] = useState<Supplement[]>(supplements)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddSupplement, setShowAddSupplement] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStore, setFilterStore] = useState<string>('all')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  // Form states
  const [newItem, setNewItem] = useState({
    title: '',
    quantity: 1,
    price: 0,
    store: '',
    category: 'Other',
    notes: '',
    priority: 'medium'
  })

  const [newSupplement, setNewSupplement] = useState({
    name: '',
    quantity_servings: 0,
    servings_per_day: 1
  })

  const supabase = createClient()

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory
      const matchesStore = filterStore === 'all' || item.store === filterStore
      
      return matchesSearch && matchesCategory && matchesStore
    })
  }, [items, searchQuery, filterCategory, filterStore])

  const pendingItems = items.filter(item => item.status === 'pending')
  const completedItems = items.filter(item => item.status === 'completed')
  const criticalSupplements = supplementsList.filter(s => s.status === 'critical')
  const lowSupplements = supplementsList.filter(s => s.status === 'warning' || s.status === 'low')

  const totalEstimatedCost = pendingItems.reduce((sum, item) => 
    sum + ((item.price || 0) * (item.quantity || 1)), 0
  )

  const addItem = async () => {
    if (!newItem.title.trim()) {
      toast.error('Please enter an item name')
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: newItem.title,
          description: `Qty: ${newItem.quantity} | Store: ${newItem.store} | Category: ${newItem.category} | Notes: ${newItem.notes}`,
          status: 'pending',
          priority: newItem.priority,
          user_id: user.id,
          category_id: categoryId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      const newShoppingItem: ShoppingItem = {
        id: data.id,
        title: newItem.title,
        description: data.description,
        status: 'pending',
        priority: newItem.priority,
        created_at: data.created_at,
        quantity: newItem.quantity,
        price: newItem.price,
        store: newItem.store,
        category: newItem.category,
        notes: newItem.notes
      }

      setItems(prev => [newShoppingItem, ...prev])
      setNewItem({
        title: '',
        quantity: 1,
        price: 0,
        store: '',
        category: 'Other',
        notes: '',
        priority: 'medium'
      })
      setShowAddItem(false)
      toast.success('Item added to shopping list!')
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Failed to add item')
    } finally {
      setIsLoading(false)
    }
  }

  const addSupplement = async () => {
    if (!newSupplement.name.trim()) {
      toast.error('Please enter a supplement name')
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('supplement_items')
        .insert({
          name: newSupplement.name,
          quantity_servings: newSupplement.quantity_servings,
          servings_per_day: newSupplement.servings_per_day,
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Calculate status for new supplement
      const daysLeft = Math.floor(newSupplement.quantity_servings / newSupplement.servings_per_day)
      const runOutDate = addDays(new Date(), daysLeft)
      let status: 'good' | 'low' | 'warning' | 'critical' = 'good'
      if (daysLeft <= 3) status = 'critical'
      else if (daysLeft <= 7) status = 'warning'
      else if (daysLeft <= 14) status = 'low'

      const newSupplementItem: Supplement = {
        ...data,
        daysLeft,
        runOutDate,
        status
      }

      setSupplementsList(prev => [...prev, newSupplementItem])
      setNewSupplement({
        name: '',
        quantity_servings: 0,
        servings_per_day: 1
      })
      setShowAddSupplement(false)
      toast.success('Supplement added!')
    } catch (error) {
      console.error('Error adding supplement:', error)
      toast.error('Failed to add supplement')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleItemComplete = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const newStatus = item.status === 'completed' ? 'pending' : 'completed'

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', itemId)

      if (error) throw error

      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, status: newStatus } : i
      ))

      toast.success(newStatus === 'completed' ? 'Item marked as bought!' : 'Item marked as pending')
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item')
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm('Remove this item from your shopping list?')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setItems(prev => prev.filter(i => i.id !== itemId))
      toast.success('Item removed from shopping list')
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to remove item')
    }
  }

  const deleteSupplement = async (supplementId: string) => {
    if (!confirm('Remove this supplement from tracking?')) return

    try {
      const { error } = await supabase
        .from('supplement_items')
        .delete()
        .eq('id', supplementId)

      if (error) throw error

      setSupplementsList(prev => prev.filter(s => s.id !== supplementId))
      toast.success('Supplement removed from tracking')
    } catch (error) {
      console.error('Error deleting supplement:', error)
      toast.error('Failed to remove supplement')
    }
  }

  const updateItemQuantity = (itemId: string, change: number) => {
    setItems(prev => prev.map(i => 
      i.id === itemId 
        ? { ...i, quantity: Math.max(1, (i.quantity || 1) + change) }
        : i
    ))
  }

  const bulkComplete = async () => {
    if (selectedItems.size === 0) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedItems))

      if (error) throw error

      setItems(prev => prev.map(i => 
        selectedItems.has(i.id) ? { ...i, status: 'completed' } : i
      ))

      setSelectedItems(new Set())
      toast.success(`${selectedItems.size} items marked as bought!`)
    } catch (error) {
      console.error('Error bulk completing items:', error)
      toast.error('Failed to update items')
    }
  }

  const getCategoryIcon = (category: string) => {
    return itemCategories.find(c => c.name === category)?.icon || '📦'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800'
      case 'warning': return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'low': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      default: return 'bg-green-100 border-green-300 text-green-800'
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shopping</h1>
            <p className="text-gray-600">Manage your shopping lists and supplement inventory</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Package className="h-3 w-3" />
            <span>{pendingItems.length} to buy</span>
          </Badge>
          {criticalSupplements.length > 0 && (
            <Badge variant="destructive" className="flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3" />
              <span>{criticalSupplements.length} critical</span>
            </Badge>
          )}
          <Button 
            size="sm"
            onClick={() => setShowAddItem(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{pendingItems.length}</div>
                <div className="text-sm text-gray-600">To Buy</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{completedItems.length}</div>
                <div className="text-sm text-gray-600">Bought</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">${totalEstimatedCost.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Est. Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{supplementsList.length}</div>
                <div className="text-sm text-gray-600">Supplements</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{criticalSupplements.length}</div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search shopping list..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              >
                <option value="all">All Categories</option>
                {itemCategories.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>

              <select 
                value={filterStore}
                onChange={(e) => setFilterStore(e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              >
                <option value="all">All Stores</option>
                {commonStores.map(store => (
                  <option key={store} value={store}>{store}</option>
                ))}
              </select>

              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedItems.size > 0 && (
            <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <Button size="sm" onClick={bulkComplete}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark as Bought
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSelectedItems(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shopping List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Shopping List ({filteredItems.length})</span>
                </div>
                <Button 
                  size="sm"
                  onClick={() => setShowAddItem(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || filterCategory !== 'all' || filterStore !== 'all' 
                      ? 'No items match your filters' 
                      : 'Your shopping list is empty'
                    }
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery || filterCategory !== 'all' || filterStore !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Add some items to get started'
                    }
                  </p>
                  <Button onClick={() => setShowAddItem(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        item.status === 'completed' 
                          ? 'bg-green-50 border-green-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={(e) => {
                            const newSelection = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelection.add(item.id)
                            } else {
                              newSelection.delete(item.id)
                            }
                            setSelectedItems(newSelection)
                          }}
                          className="rounded"
                        />

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 rounded-full"
                          onClick={() => toggleItemComplete(item.id)}
                        >
                          {item.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <ShoppingCart className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">{getCategoryIcon(item.category || 'Other')}</span>
                            <h3 className={`font-medium ${item.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                              {item.title}
                            </h3>
                            {item.priority === 'high' && (
                              <Badge variant="destructive" className="text-xs">High</Badge>
                            )}
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => updateItemQuantity(item.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="font-medium">Qty: {item.quantity || 1}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => updateItemQuantity(item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            {item.price && item.price > 0 && (
                              <span>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                            )}

                            {item.store && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{item.store}</span>
                              </div>
                            )}
                          </div>

                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-2">{item.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Supplement Tracker */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Supplements</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowAddSupplement(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {supplementsList.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-500 mb-3">No supplements tracked</p>
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddSupplement(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Supplement
                    </Button>
                  </div>
                ) : (
                  supplementsList.map((supplement) => (
                    <div
                      key={supplement.id}
                      className={`p-3 rounded-lg border-2 ${getStatusColor(supplement.status)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{supplement.name}</h4>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setEditingSupplement(supplement)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500"
                            onClick={() => deleteSupplement(supplement.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {supplement.daysLeft !== null ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Days left:</span>
                            <span className="font-medium">{supplement.daysLeft}</span>
                          </div>
                          {supplement.runOutDate && (
                            <div className="text-xs text-gray-600">
                              Runs out: {format(supplement.runOutDate, 'MMM d, yyyy')}
                            </div>
                          )}
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, (supplement.daysLeft / 30) * 100))}%`,
                                backgroundColor: supplement.status === 'critical' ? '#ef4444' :
                                                supplement.status === 'warning' ? '#f59e0b' :
                                                supplement.status === 'low' ? '#eab308' : '#10b981'
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          No tracking data available
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Items to buy:</span>
                <span className="font-medium">{pendingItems.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total estimated cost:</span>
                <span className="font-medium">${totalEstimatedCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Critical supplements:</span>
                <span className="font-medium text-red-600">{criticalSupplements.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Low supplements:</span>
                <span className="font-medium text-orange-600">{lowSupplements.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Add Shopping Item</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <Input
                placeholder="Item name (e.g., Milk, Bread)"
                value={newItem.title}
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                autoFocus
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Est. Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.price}
                    onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {itemCategories.map(cat => (
                      <option key={cat.name} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Store</label>
                  <select
                    value={newItem.store}
                    onChange={(e) => setNewItem(prev => ({ ...prev, store: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Select store</option>
                    {commonStores.map(store => (
                      <option key={store} value={store}>{store}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Textarea
                placeholder="Notes (optional)"
                value={newItem.notes}
                onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="p-6 border-t flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAddItem(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={addItem}
                disabled={isLoading || !newItem.title.trim()}
              >
                {isLoading ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplement Modal */}
      {showAddSupplement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Add Supplement</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <Input
                placeholder="Supplement name (e.g., Vitamin D, Protein Powder)"
                value={newSupplement.name}
                onChange={(e) => setNewSupplement(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Total Servings</label>
                  <Input
                    type="number"
                    min="1"
                    value={newSupplement.quantity_servings}
                    onChange={(e) => setNewSupplement(prev => ({ ...prev, quantity_servings: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Per Day</label>
                  <Input
                    type="number"
                    min="1"
                    value={newSupplement.servings_per_day}
                    onChange={(e) => setNewSupplement(prev => ({ ...prev, servings_per_day: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              {newSupplement.quantity_servings > 0 && newSupplement.servings_per_day > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-700">
                    This will last approximately{' '}
                    <span className="font-medium">
                      {Math.floor(newSupplement.quantity_servings / newSupplement.servings_per_day)} days
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAddSupplement(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={addSupplement}
                disabled={isLoading || !newSupplement.name.trim()}
              >
                {isLoading ? 'Adding...' : 'Add Supplement'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 