/* eslint-disable @next/next/no-img-element */
'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toast } from '@capacitor/toast';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { Sidebar } from 'primereact/sidebar';
import { InputText } from 'primereact/inputtext';
import { Divider } from 'primereact/divider';
import { Skeleton } from 'primereact/skeleton';
import { useDebounce } from 'primereact/hooks'; 
import { ReportsService } from '@/demo/service/reports.service';
import { SalesOrderService } from '@/demo/service/sales-order.service';
import FullPageLoader from '@/demo/components/FullPageLoader';
import './pending-sales.css';

interface JobOrderStatus {
  id: string;
  job_order_main_id: string;
  status: string;
  status_name: string;
}

interface PendingOrderItem {
  id: string;
  order_id: string;
  customerID: string;
  customerName: string;
  productID: string;
  productName: string;
  productRef: string;
  deliveryDate: string;
  admsite_code: string;
  statusId: number;
  status: string;
  jobOrderStatus: JobOrderStatus[];
  last_jobId: string | null;
  receivedDate?: string;
}

interface PendingOrdersResponse {
  data: PendingOrderItem[];
  paginatorInfo: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    hasMorePages: boolean;
  };
}

const PendingSalesReport = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<PendingOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 1000);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 10,
    total: 0,
    hasMorePages: true
  });
  const [statusSidebarVisible, setStatusSidebarVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingOrderItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PendingOrderItem | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastOrderRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  const availableStatuses = [
    { id: 1, name: 'Pending' },
    { id: 2, name: 'In Progress' },
    { id: 3, name: 'Completed' },
    { id: 4, name: 'Cancelled' }
  ];

  const fetchPendingOrders = useCallback(async (page: number, perPage: number, loadMore = false) => {
    try {
      if (loadMore) {
        setIsFetchingMore(true);
      } else {
        setLoading(true);
      }

      const response: PendingOrdersResponse = await ReportsService.getPendingSalesOrders(
        page,
        perPage,
        debouncedSearchTerm
      );

      if (loadMore) {
        setOrders(prev => [...prev, ...response.data]);
      } else {
        setOrders(response.data);
      }

      setPagination({
        currentPage: response.paginatorInfo.currentPage,
        perPage: response.paginatorInfo.perPage,
        total: response.paginatorInfo.total,
        hasMorePages: response.paginatorInfo.hasMorePages
      });
    } catch (error) {
      console.error('Error fetching pending sales orders:', error);
      await Toast.show({
        text: 'Failed to load pending orders',
        duration: 'short',
        position: 'bottom'
      });
    } finally {
      if (loadMore) {
        setIsFetchingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchPendingOrders(1, pagination.perPage);
  }, [fetchPendingOrders, pagination.perPage, debouncedSearchTerm]);

  useEffect(() => {
    if (!pagination.hasMorePages || loading || isFetchingMore) return;

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) {
        fetchPendingOrders(pagination.currentPage + 1, pagination.perPage, true);
      }
    };

    if (lastOrderRef.current) {
      observer.current = new IntersectionObserver(observerCallback, {
        root: null,
        rootMargin: '20px',
        threshold: 1.0
      });

      observer.current.observe(lastOrderRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [pagination, loading, isFetchingMore, fetchPendingOrders]);

  const getStatusSeverity = (status: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'info';
      case 'Pending': return 'warning';
      case 'Cancelled': return 'danger';
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleCreateViewJO = (item: PendingOrderItem) => {
    const { order_id, jobOrderStatus } = item;
    
    if (jobOrderStatus.length === 0) {
      router.push(`/pages/orders/job-order?id=${order_id}&completed=false&source=pending-sales`);
    } else {
      router.push(`/pages/orders/job-order?id=${order_id}&source=pending-sales`);
    }
  };

  const openStatusChangeDialog = (item: PendingOrderItem) => {
    setSelectedItem(item);
    setSelectedStatus(item.statusId);
    setStatusSidebarVisible(true);
  };

  const handleStatusChange = async (statusId: number) => {
    if (!selectedItem) return;

    try {
      setIsSaving(true);
      
      await SalesOrderService.updateSalesOrderStatus(
        selectedItem.id,
        { status_id: statusId }
      );

      await Toast.show({
        text: 'Status updated successfully',
        duration: 'short',
        position: 'bottom'
      });

      await fetchPendingOrders(1, pagination.perPage);
      setStatusSidebarVisible(false);
    } catch (error) {
      console.error('Error updating status:', error);
      await Toast.show({
        text: 'Failed to update status',
        duration: 'short',
        position: 'bottom'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (item: PendingOrderItem) => {
    setItemToDelete(item);
    setDeleteConfirmVisible(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      setIsSaving(true);
      
      await ReportsService.deleteSalesOrderItem(itemToDelete.id);

      await Toast.show({
        text: 'Item deleted successfully',
        duration: 'short',
        position: 'bottom'
      });

      await fetchPendingOrders(1, pagination.perPage);
    } catch (error) {
      console.error('Error deleting item:', error);
      await Toast.show({
        text: 'Failed to delete item',
        duration: 'short',
        position: 'bottom'
      });
    } finally {
      setIsSaving(false);
      setDeleteConfirmVisible(false);
    }
  };

  const viewSalesOrder = (orderId: string) => {
    router.push(`/pages/orders/sales-order?id=${orderId}&source=pending-sales`);
  };

  const handleMouseEnter = (id: string) => setActiveCard(id);
  const handleMouseLeave = () => setActiveCard(null);

  const handleTouchStart = (id: string) => {
    longPressTimeout.current = setTimeout(() => setActiveCard(id), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
  };

  if (loading && !isFetchingMore && !debouncedSearchTerm) {
    return (
      <div className="flex flex-column p-3 lg:p-5" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-4 gap-3 w-full">
          <Skeleton width="10rem" height="2rem" />
          <Skeleton width="100%" height="2.5rem" className="md:w-20rem" />
        </div>
  
        <div className="grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="col-12 md:col-6 lg:col-4">
              <Card className="h-full">
                <div className="flex flex-column gap-2">
                  <div className="flex justify-content-between align-items-center">
                    <Skeleton width="8rem" height="1.25rem" />
                    <Skeleton width="5rem" height="1.25rem" />
                  </div>
  
                  <Divider className="my-2" />
  
                  <div className="flex flex-column gap-1">
                    <div className="flex justify-content-between">
                      <Skeleton width="6rem" height="1rem" />
                      <Skeleton width="7rem" height="1rem" />
                    </div>
                    <div className="flex justify-content-between">
                      <Skeleton width="6rem" height="1rem" />
                      <Skeleton width="7rem" height="1rem" />
                    </div>
                    <div className="flex justify-content-between">
                      <Skeleton width="6rem" height="1rem" />
                      <Skeleton width="7rem" height="1rem" />
                    </div>
                  </div>
  
                  <Divider className="my-2" />
  
                  <div className="flex gap-2">
                    <Skeleton width="100%" height="2rem" />
                    <Skeleton width="100%" height="2rem" />
                    <Skeleton width="100%" height="2rem" />
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-column p-3 lg:p-5" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {isSaving && <FullPageLoader />}
      
      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-4 gap-3">
        <h2 className="text-2xl m-0">Pending Sales Orders Report</h2>
        <span className="p-input-icon-left p-input-icon-right w-full">
          <i className="pi pi-search" />
          <InputText 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="w-full"
          />

          {loading && debouncedSearchTerm ? (
            <i className="pi pi-spin pi-spinner" />
          ) : searchTerm ? (
            <i 
              className="pi pi-times cursor-pointer" 
              onClick={() => {
                setSearchTerm('');
              }}
            />
          ) : null}
        </span>
      </div>
      
      <div className="grid">
        {orders.length > 0 ? (
          orders.map((item, index) => (
            <div
              key={`${item.order_id}-${item.id}`}
              className="col-12 md:col-6 lg:col-4"
              ref={index === orders.length - 1 ? lastOrderRef : null}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
              onTouchStart={() => handleTouchStart(item.id)}
              onTouchEnd={handleTouchEnd}
              style={{ position: 'relative' }}
            >
              <div className={`card-opacity-wrapper${activeCard === item.id ? ' faded' : ''}`}>
                <Card className="exact-order-card">
                  <div className="exact-card-row">
                    <div className="exact-avatar">
                      <span>
                        {item.customerName
                          ? item.customerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                          : ''}
                      </span>
                    </div>
                    <div className="exact-main">
                      <div className="exact-header-row">
                        <span className="exact-status">{item.customerName}</span>
                        <span className="exact-order-no">Order No: {item.order_id}</span>
                      </div>
                      <div className="exact-product-row">
                        <span className="exact-product bold-text">{item.productName || "Kurta Pajama"}</span>
                      </div>
                      <div className="exact-dates-row">
                        <span className="exact-date"><span className="date-label">Trial:</span> {item.deliveryDate || "11 Jun 2025"}</span>
                        <span className="exact-date"><span className="date-label">Received:</span> {item.receivedDate || "12 Jun 2025"}</span>
                        <span className="exact-delivery-date"><span className="date-label">Delivery:</span> {item.deliveryDate || "12 Jun 2025"}</span>
                      </div>
                    </div>
                    <div className="exact-tags">
                      <span className="exact-stitching-tag">Stitching</span>
                      <span className="exact-status-tag">{item.status}</span>
                    </div>
                  </div>
                </Card>
              </div>
              {activeCard === item.id && (
                <div className="card-action-row-center">
                  <button
                    className="card-action-btn-modern btn-blue"
                    onClick={() => handleCreateViewJO(item)}
                    title="Create Job Order"
                  >
                    <i className="pi pi-plus"></i>
                  </button>
                  <button
                    className="card-action-btn-modern btn-green"
                    onClick={() => openStatusChangeDialog(item)}
                    title="Change Status"
                  >
                    <i className="pi pi-cog"></i>
                  </button>
                  <button
                    className="card-action-btn-modern btn-orange"
                    onClick={() => viewSalesOrder(item.order_id)}
                    title="View Sales Order"
                  >
                    <i className="pi pi-eye"></i>
                  </button>
                  <button
                    className="card-action-btn-modern btn-red"
                    onClick={() => confirmDelete(item)}
                    title="Delete"
                  >
                    <i className="pi pi-trash"></i>
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-12">
            <div className="p-4 text-center surface-100 border-round">
              <i className="pi pi-search text-3xl mb-1" />
              <h4>No pending orders found</h4>
            </div>
          </div>
        )}
      </div>

      {isFetchingMore && (
        <div className="flex justify-content-center mt-3">
          <div className="flex align-items-center gap-2">
            <i className="pi pi-spinner pi-spin" />
            <span>Loading more orders...</span>
          </div>
        </div>
      )}

      <Sidebar 
        visible={statusSidebarVisible} 
        onHide={() => setStatusSidebarVisible(false)}
        position="bottom"
        style={{ 
          width: '100%',
          height: 'auto',
          maxHeight: '62vh',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
        }}
        header={
          <div className="sticky top-0 bg-white z-1 p-3 surface-border flex justify-content-between align-items-center">
            <span className="font-bold text-xl">Update Item Status</span>
          </div>
        }
        className="p-0"
      >
        <div className="p-3">
          <div className="grid">
            {availableStatuses.map(status => (
              <div key={status.id} className="col-12 md:col-6 lg:col-4 p-2">
                <Button
                  label={status.name}
                  onClick={() => handleStatusChange((status.id))}
                  severity={getStatusSeverity(status.name) || undefined}
                  className="w-full p-3 text-lg justify-content-start p-button-outlined"
                  icon={
                    status.name === 'Completed' ? 'pi pi-check-circle' :
                    status.name === 'In Progress' ? 'pi pi-spinner' :
                    status.name === 'Pending' ? 'pi pi-clock' :
                    status.name === 'Cancelled' ? 'pi pi-times-circle' :
                    'pi pi-info-circle'
                  }
                  disabled={
                    (status.id) === selectedItem?.statusId || 
                    ((status.id) === 3 && (
                      !selectedItem?.jobOrderStatus?.length || 
                      selectedItem.jobOrderStatus[selectedItem.jobOrderStatus.length - 1].status_name !== 'Completed'
                    ))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </Sidebar>

      <Dialog 
        header="Confirm Delete" 
        visible={deleteConfirmVisible} 
        onHide={() => setDeleteConfirmVisible(false)}
        style={{ width: '90vw', maxWidth: '500px' }}
      >
        <div className="flex flex-column gap-3 mt-2">
          <p>
            {itemToDelete && orders.filter(o => o.order_id === itemToDelete.order_id).length === 1 
              ? "This is the only item in the Sales Order. Deleting this will delete the entire Sales Order. Continue?"
              : "Are you sure you want to delete this item?"}
          </p>
          
          <div className="flex justify-content-end gap-2 mt-3">
            <Button 
              label="Cancel" 
              icon="pi pi-times" 
              onClick={() => setDeleteConfirmVisible(false)}
              className="p-button-text"
            />
            <Button 
              label="Delete" 
              icon="pi pi-trash" 
              onClick={handleDeleteItem}
              className="p-button-danger"
              loading={isSaving}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default PendingSalesReport;