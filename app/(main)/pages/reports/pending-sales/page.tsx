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
    const [actionMenuVisible, setActionMenuVisible] = useState(false);
    const [activeCardItem, setActiveCardItem] = useState<PendingOrderItem | null>(null);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [isLongPressing, setIsLongPressing] = useState(false);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastOrderRef = useRef<HTMLDivElement>(null);

    const availableStatuses = [
        { id: 1, name: 'Pending' },
        { id: 2, name: 'In Progress' },
        { id: 3, name: 'Completed' },
        { id: 4, name: 'Cancelled' }
    ];

    const fetchPendingOrders = useCallback(
        async (page: number, perPage: number, loadMore = false) => {
            try {
                if (loadMore) {
                    setIsFetchingMore(true);
                } else {
                    setLoading(true);
                }

                const response: PendingOrdersResponse = await ReportsService.getPendingSalesOrders(page, perPage, debouncedSearchTerm);

                if (loadMore) {
                    setOrders((prev) => [...prev, ...response.data]);
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
        },
        [debouncedSearchTerm]
    );

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

    const handleMouseDown = (e: React.MouseEvent, item: PendingOrderItem) => {
        e.preventDefault();
        setIsLongPressing(false);
        const timer = setTimeout(() => {
            setIsLongPressing(true);
            setActiveCardItem(item);
             if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500);
        setLongPressTimer(timer);
    };

    const handleMouseUp = (item: PendingOrderItem) => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }

        if (!isLongPressing) {
            setTimeout(() => {
                viewSalesOrder(item.order_id);
            }, 50);
        }
    };

    const handleMouseLeave = () => {
        if (longPressTimer && !isLongPressing) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const handleTouchStart = (e: React.TouchEvent, item: PendingOrderItem) => {
        e.preventDefault();
        setIsLongPressing(false);
        const timer = setTimeout(() => {
            setIsLongPressing(true);
            setActiveCardItem(item);
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500);
        setLongPressTimer(timer);
    };

    const handleTouchEnd = (item: PendingOrderItem) => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }

        if (!isLongPressing) {
            setTimeout(() => {
                viewSalesOrder(item.order_id);
            }, 50);
        }
    };

    const closeActionOverlay = () => {
        setActiveCardItem(null);
        setIsLongPressing(false);
    };

    const handleOverlayBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            closeActionOverlay();
        }
    };
    const getStatusSeverity = (status: string) => {
        switch (status) {
            case 'Completed':
                return 'success';
            case 'In Progress':
                return 'info';
            case 'Pending':
                return 'warning';
            case 'Cancelled':
                return 'danger';
            default:
                return null;
        }
    };

    const getStatusBackgroundColor = (status: string) => {
        switch (status) {
            case 'Completed':
                return '#D1E7DD';
            case 'In Progress':
                return '#CCE5FF';
            case 'Pending':
                return '#FFF3CD';
            case 'Cancelled':
                return '#F8D7DA';
            case 'Accepted':
                return '#D4B5A0';
            case 'Ready':
                return '#E2E3E5';
            case 'Delivered':
                return '#D1E7DD';
            case 'On Hold':
                return '#FFEAA7';
            default:
                return '#E2E3E5';
        }
    };

    const getStatusTextColor = (status: string) => {
        switch (status) {
            case 'Completed':
                return '#0F5132';
            case 'In Progress':
                return '#0066CC';
            case 'Pending':
                return '#856404';
            case 'Cancelled':
                return '#721C24';
            case 'Accepted':
                return '#8B4513';
            case 'Ready':
                return '#495057';
            case 'Delivered':
                return '#0F5132';
            case 'On Hold':
                return '#D63031';
            default:
                return '#495057';
        }
    };

    const getStatusBorderColor = (status: string) => {
        switch (status) {
            case 'Completed':
                return '#0F5132';
            case 'In Progress':
                return '#0066CC';
            case 'Pending':
                return '#856404';
            case 'Cancelled':
                return '#721C24';
            case 'Accepted':
                return '#8B4513';
            case 'Ready':
                return '#495057';
            case 'Delivered':
                return '#0F5132';
            case 'On Hold':
                return '#D63031';
            default:
                return '#495057';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
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
        setActionMenuVisible(false);
    };

    const openStatusChangeDialog = (item: PendingOrderItem) => {
        setSelectedItem(item);
        setSelectedStatus(item.statusId);
        setStatusSidebarVisible(true);
        setActionMenuVisible(false);
    };

    const handleStatusChange = async (statusId: number) => {
        if (!selectedItem) return;

        try {
            setIsSaving(true);

            await SalesOrderService.updateSalesOrderStatus(selectedItem.id, { status_id: statusId });

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
        setActionMenuVisible(false);
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

    const getStatusColor = (status: any) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'var(--green-500)';
            case 'in-progress':
            case 'processing':
                return 'var(--blue-500)';
            case 'pending':
                return 'var(--orange-500)';
            case 'cancelled':
            case 'rejected':
                return 'var(--red-500)';
            default:
                return 'var(--surface-300)';
        }
    };

    return (
        <div className="flex flex-column p-3 lg:p-5" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {isSaving && <FullPageLoader />}

            <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-4 gap-3">
                <h2 className="text-2xl m-0">Pending Sales Orders Report</h2>
                <span className="p-input-icon-left p-input-icon-right w-full">
                    <i className="pi pi-search" />
                    <InputText value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search" className="w-full" />

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
                        <div key={`${item.order_id}-${item.id}`} className="col-12 md:col-6 lg:col-4" ref={index === orders.length - 1 ? lastOrderRef : null}>
                            <div className="relative">
                                <Card
                                    className="h-full border-round-lg cursor-pointer transition-all transition-duration-200 hover:shadow-3"
                                    style={{
                                        border: `2px solid #E8D5D5`,
                                        backgroundColor: '#FDF9F9',
                                        userSelect: 'none',
                                        transform: isLongPressing && activeCardItem?.id === item.id ? 'scale(0.98)' : 'scale(1)'
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, item)}
                                    onMouseUp={() => handleMouseUp(item)}
                                    onMouseLeave={handleMouseLeave}
                                    onTouchStart={(e) => handleTouchStart(e, item)}
                                    onTouchEnd={() => handleTouchEnd(item)}
                                >
                                    <div className="flex flex-column gap-3">
                                        <div className="flex justify-content-between align-items-center">
                                            <div className="flex align-items-center gap-2">
                                                <div
                                                    style={{
                                                        backgroundColor: '#D4B5A0',
                                                        border: 'none'
                                                    }}
                                                    className="w-5rem h-5rem border-round flex align-items-center justify-content-center"
                                                >
                                                    <span className="font-bold text-white text-lg">{item.customerName?.substring(0, 2).toUpperCase() || 'OR'}</span>
                                                </div>
                                                <div className="flex flex-column">
                                                    <div className="flex align-items-center gap-2 mb-1">
                                                        <i className="pi pi-user text-700 text-sm"></i>
                                                        <span className="font-semibold text-900 text-base">{item.customerName}</span>
                                                    </div>
                                                    <span className="text-600 text-sm">Order No: {item.order_id}</span>
                                                </div>
                                            </div>
                                            <div className="flex align-items-center gap-1">
                                                <i className="pi pi-tag" style={{ color: '#8B4513' }}></i>
                                                <span style={{ color: '#8B4513' }} className="font-medium text-sm">
                                                    Stitching
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-content-between align-items-center">
                                            <div className="flex align-items-center gap-2 p-2 border-round" style={{ backgroundColor: '#F5F5F5' }}>
                                                <i className="pi pi-shopping-bag text-primary"></i>
                                                <span className="font-medium text-900 text-sm">{item.productName}</span>
                                            </div>
                                            <Tag
                                                style={{
                                                    backgroundColor: getStatusBackgroundColor(item.status),
                                                    color: getStatusTextColor(item.status),
                                                    border: `2px solid ${getStatusBorderColor(item.status)}`,
                                                    borderRadius: '20px',
                                                    padding: '0.3rem 1rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500'
                                                }}
                                                value={item.status}
                                            />
                                        </div>

                                        <Divider className="my-0" style={{ borderColor: '#E8D5D5' }} />

                                        <div className="flex flex-column gap-2">
                                            <div className="flex justify-content-between align-items-center">
                                                <div className="flex align-items-center gap-2">
                                                    <i className="pi pi-calendar text-600 text-sm"></i>
                                                    <span className="text-600 text-sm">Trial:</span>
                                                    <span className="font-medium text-900 text-sm">{item?.deliveryDate ? formatDate(item.deliveryDate) : '-'}</span>
                                                </div>
                                                <div className="flex align-items-center gap-2">
                                                    <i className="pi pi-truck text-600 text-sm"></i>
                                                    <span className="text-600 text-sm">Delivery:</span>
                                                    <span className="font-medium text-900 text-sm">{item?.deliveryDate ? formatDate(item.deliveryDate) : '-'}</span>
                                                </div>
                                            </div>

                                            <div className="flex align-items-center gap-2">
                                                <i className="pi pi-clock text-600 text-sm"></i>
                                                <span className="text-600 text-sm">Received:</span>
                                                <span className="font-medium text-900 text-sm">{item?.deliveryDate ? formatDate(item.deliveryDate) : '-'}</span>
                                            </div>
                                        </div>

                                        {/* Instruction text */}
                                        <div className="text-center p-2 border-round" style={{ backgroundColor: '#F0F8FF', border: '1px solid #E3F2FD' }}>
                                            <span className="text-xs text-600">
                                                <i className="pi pi-info-circle mr-1"></i>
                                                Tap to view • Long press for actions
                                            </span>
                                        </div>
                                    </div>
                                </Card>

                                {/* Action Overlay */}
                                {activeCardItem?.id === item.id && (
                                    <div
                                        className="absolute top-0 left-0 w-full h-full flex align-items-center justify-content-center border-round-lg"
                                        style={{
                                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                            backdropFilter: 'blur(2px)',
                                            zIndex: 10
                                        }}
                                        onClick={handleOverlayBackgroundClick}
                                    >
                                        <div className="flex flex-column gap-3 p-4 w-full" onClick={(e) => e.stopPropagation()}>
                                            {/* Header */}
                                            <div className="flex justify-content-between align-items-center mb-2">
                                                <div className="flex align-items-center gap-2">
                                                    <div
                                                        style={{
                                                            backgroundColor: '#6366F1',
                                                            border: 'none'
                                                        }}
                                                        className="w-2rem h-2rem border-round flex align-items-center justify-content-center"
                                                    >
                                                        <span className="font-bold text-white text-xs">{item.customerName?.substring(0, 2).toUpperCase() || 'OR'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-white text-sm">{item.customerName}</span>
                                                        <div className="text-xs text-300">Order: {item.order_id}</div>
                                                    </div>
                                                </div>
                                                <Button icon="pi pi-times" className="p-button-text p-button-rounded p-button-sm" style={{ color: 'white' }} onClick={closeActionOverlay} />
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-column gap-2">
                                                <Button
                                                    label={(item.jobOrderStatus?.length ?? 0) > 0 ? 'View Job Order' : 'Create Job Order'}
                                                    icon={(item.jobOrderStatus?.length ?? 0) > 0 ? 'pi pi-eye' : 'pi pi-plus'}
                                                    onClick={() => handleCreateViewJO(item)}
                                                    className="p-button-sm border-round-lg"
                                                    style={{
                                                        background: (item.jobOrderStatus?.length ?? 0) > 0 ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                                        border: 'none',
                                                        fontSize: '0.75rem'
                                                    }}
                                                />

                                                <Button
                                                    label="Change Status"
                                                    icon="pi pi-cog"
                                                    onClick={() => openStatusChangeDialog(item)}
                                                    className="p-button-sm border-round-lg"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
                                                        border: 'none',
                                                        fontSize: '0.75rem'
                                                    }}
                                                />

                                                <div className="flex gap-2">
                                                    <Button
                                                        label="View Sales Order"
                                                        icon="pi pi-eye"
                                                        onClick={() => viewSalesOrder(item.order_id)}
                                                        className="flex-1 p-button-sm border-round-lg"
                                                        style={{
                                                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                                            border: 'none',
                                                            fontSize: '0.75rem'
                                                        }}
                                                    />
                                                    <Button
                                                        icon="pi pi-trash"
                                                        onClick={() => confirmDelete(item)}
                                                        className="p-button-sm border-round-lg"
                                                        style={{
                                                            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                                                            border: 'none',
                                                            minWidth: '40px'
                                                        }}
                                                        disabled={(item.jobOrderStatus?.length ?? 0) > 0 && item.jobOrderStatus?.[item.jobOrderStatus.length - 1]?.status_name === 'Completed'}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-12">
                        <div className="p-4 text-center surface-100 border-round">
                            <i className="pi pi-search text-3xl mb-1" />
                            <h4>No pending orders found</h4>
                            <p className="text-600 mt-2">Orders will appear here when they're created</p>
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

            {/* Status Change Sidebar */}
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
                        {availableStatuses.map((status) => (
                            <div key={status.id} className="col-12 md:col-6 lg:col-4 p-2">
                                <Button
                                    label={status.name}
                                    onClick={() => handleStatusChange(status.id)}
                                    severity={getStatusSeverity(status.name) || undefined}
                                    className="w-full p-3 text-lg justify-content-start p-button-outlined"
                                    icon={
                                        status.name === 'Completed'
                                            ? 'pi pi-check-circle'
                                            : status.name === 'In Progress'
                                            ? 'pi pi-spinner'
                                            : status.name === 'Pending'
                                            ? 'pi pi-clock'
                                            : status.name === 'Cancelled'
                                            ? 'pi pi-times-circle'
                                            : 'pi pi-info-circle'
                                    }
                                    disabled={status.id === selectedItem?.statusId || (status.id === 3 && (!selectedItem?.jobOrderStatus?.length || selectedItem.jobOrderStatus[selectedItem.jobOrderStatus.length - 1].status_name !== 'Completed'))}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </Sidebar>

            <Dialog header="Confirm Delete" visible={deleteConfirmVisible} onHide={() => setDeleteConfirmVisible(false)} style={{ width: '90vw', maxWidth: '500px' }}>
                <div className="flex flex-column gap-3 mt-2">
                    <p>
                        {itemToDelete && orders.filter((o) => o.order_id === itemToDelete.order_id).length === 1
                            ? 'This is the only item in the Sales Order. Deleting this will delete the entire Sales Order. Continue?'
                            : 'Are you sure you want to delete this item?'}
                    </p>

                    <div className="flex justify-content-end gap-2 mt-3">
                        <Button label="Cancel" icon="pi pi-times" onClick={() => setDeleteConfirmVisible(false)} className="p-button-text" />
                        <Button label="Delete" icon="pi pi-trash" onClick={handleDeleteItem} className="p-button-danger" loading={isSaving} />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default PendingSalesReport;