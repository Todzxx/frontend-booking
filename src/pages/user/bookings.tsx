import { useEffect, useState, useMemo } from "react";
import { Card, Chip, Button, Modal, Checkbox, Label } from "@heroui/react";
import {
  ClipboardList,
  Calendar,
  Clock,
  MapPin,
  Hash,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  Trash2,
  Download,
} from "lucide-react";

import api from "@/config/api";

// ── Export bookings to CSV ────────────────────────────────────────────────────
function exportMyBookingsCSV(bookings: any[]) {
  const headers = [
    "ID",
    "Purpose",
    "Facility",
    "Start Time",
    "End Time",
    "Status",
    "Recurring",
  ];
  const rows = bookings.map((b) => [
    b.id,
    `"${(b.purpose ?? "").replace(/"/g, '""')}"`,
    `"${b.facility?.name ?? ""}"`,
    new Date(b.startTime).toLocaleString("id-ID"),
    new Date(b.endTime).toLocaleString("id-ID"),
    b.status,
    b.recurrenceGroupId ? "Yes" : "No",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `my_bookings_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BookingsPage() {
  // State untuk menyimpan daftar booking dan status aksi (cancel)
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelAll, setCancelAll] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Fungsi untuk mengambil data booking user yang sedang login
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await api.get("/bookings/my");
      const data = response.data.data?.bookings || response.data.data || [];

      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error fetching bookings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Fungsi untuk membatalkan pesanan (update status ke CANCELLED)
  const handleCancelBooking = async (id: string, all: boolean = false) => {
    setActionLoading(id);
    try {
      // Backend expects cancelAll in query params
      await api.patch(`/bookings/${id}/cancel?cancelAll=${all}`);
      await fetchBookings(); // Refresh data setelah berhasil
      setIsCancelModalOpen(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error cancelling booking", err);
      alert("Failed to cancel booking");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle2 className="mr-1" size={16} />;
      case "PENDING":
        return <Clock className="mr-1" size={16} />;
      case "CANCELLED":
      case "REJECTED":
        return <XCircle className="mr-1" size={16} />;
      default:
        return <AlertCircle className="mr-1" size={16} />;
    }
  };

  const getStatusColor = (
    status: string,
  ): "default" | "danger" | "success" | "warning" | "accent" => {
    switch (status) {
      case "PENDING":
        return "warning";
      case "APPROVED":
        return "success";
      case "REJECTED":
      case "CANCELLED":
        return "danger";
      case "COMPLETED":
        return "accent";
      default:
        return "default";
    }
  };

  const STATUS_TABS = [
    "ALL",
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
  ] as const;
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const filteredBookings = useMemo(() => {
    if (activeTab === "ALL") return bookings;

    return bookings.filter((b) => b.status === activeTab);
  }, [bookings, activeTab]);

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            My Bookings
          </h1>
          <p className="text-muted font-medium text-lg">
            Manage and review your reservation history.
          </p>
        </div>
        {bookings.length > 0 && (
          <Button
            className="h-11 px-6 rounded-2xl font-black text-xs border-default-200 gap-2 shrink-0"
            variant="ghost"
            onPress={() => exportMyBookingsCSV(bookings)}
          >
            <Download size={16} />
            Export CSV
          </Button>
        )}
      </div>

      {/* Status filter tabs */}
      {!loading && bookings.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const count =
              tab === "ALL"
                ? bookings.length
                : bookings.filter((b) => b.status === tab).length;

            return (
              <button
                key={tab}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all duration-200 ${
                  activeTab === tab
                    ? tab === "ALL"
                      ? "bg-primary text-white border-primary"
                      : tab === "PENDING"
                        ? "bg-warning text-white border-warning"
                        : tab === "APPROVED"
                          ? "bg-success text-white border-success"
                          : "bg-danger text-white border-danger"
                    : "bg-background border-default-200 text-default-500 hover:border-default-400"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 bg-default-100 rounded-3xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="p-20 flex flex-col items-center justify-center text-center bg-default-50/30 border-dashed border-2 border-default-200 rounded-[2.5rem]">
          <div className="w-20 h-20 bg-default-100 rounded-3xl flex items-center justify-center mb-6">
            <ClipboardList className="text-default-300" size={40} />
          </div>
          <p className="text-default-400 text-xl font-black">
            {activeTab !== "ALL"
              ? `No ${activeTab.toLowerCase()} bookings.`
              : "No bookings found."}
          </p>
          <p className="text-default-400 mt-1 font-medium">
            {activeTab !== "ALL" ? (
              <button
                className="text-primary underline"
                onClick={() => setActiveTab("ALL")}
              >
                Show all
              </button>
            ) : (
              "Your schedule is currently empty."
            )}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredBookings.map((booking) => (
            <Card
              key={booking.id}
              className="group overflow-hidden rounded-[2.5rem] border border-default-200 bg-background/60 backdrop-blur-md hover:shadow-2xl hover:shadow-default-100 transition-all duration-500"
            >
              <Card.Header className="flex justify-between items-center px-8 pt-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-default-100 rounded-2xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Hash size={20} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-default-400 uppercase tracking-widest">
                      Reference
                    </p>
                    <p className="text-lg font-black text-foreground">
                      #{booking.id.substring(0, 8)}
                    </p>
                  </div>
                </div>
                <Chip
                  className="font-black px-3 h-8 text-[10px] uppercase tracking-widest"
                  color={getStatusColor(booking.status)}
                  variant="soft"
                >
                  <div className="flex items-center">
                    {getStatusIcon(booking.status)}
                    {booking.status}
                  </div>
                </Chip>
              </Card.Header>

              <Card.Content className="px-8 py-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-default-50/50 rounded-2xl border border-default-100">
                    <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center shadow-sm">
                      <Calendar className="text-primary" size={18} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black text-default-400 uppercase tracking-widest">
                        Time Slot
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {new Date(booking.startTime).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}{" "}
                        •{" "}
                        {new Date(booking.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(booking.endTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 px-1">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-default-400 mt-1" size={16} />
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black text-default-400 uppercase tracking-widest">
                        Facility
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {booking.facility?.name ||
                          "Room ID: " + booking.facilityId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ClipboardList
                      className="text-default-400 mt-1"
                      size={16}
                    />
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black text-default-400 uppercase tracking-widest">
                        Purpose
                      </p>
                      <p className="text-sm font-medium text-default-600 italic">
                        &ldquo;{booking.purpose || "General Activity"}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {booking.notes && (
                  <div className="flex items-start gap-3 p-4 bg-warning/5 rounded-2xl border border-warning/10">
                    <div className="p-1.5 bg-warning/20 rounded-lg text-warning-600">
                      <Info size={14} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black text-warning-600 uppercase tracking-widest">
                        Admin Note
                      </p>
                      <p className="text-xs text-warning-700 font-medium">
                        {booking.notes}
                      </p>
                    </div>
                  </div>
                )}
              </Card.Content>
              <Card.Footer className="px-8 pb-8 pt-0 flex justify-between items-center">
                <p className="text-[10px] text-default-400 font-bold uppercase tracking-widest">
                  Created {new Date(booking.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  {booking.status === "PENDING" && (
                    <Button
                      className="rounded-xl font-black"
                      isPending={actionLoading === booking.id}
                      variant="danger-soft"
                      onPress={() => {
                        setSelectedBooking(booking);
                        setCancelAll(false);
                        setIsCancelModalOpen(true);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    className="rounded-xl h-8 font-bold text-xs"
                    variant="ghost"
                  >
                    Details
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          ))}
        </div>
      )}

      {/* Cancellation Modal */}
      <Modal>
        <Modal.Backdrop
          isOpen={isCancelModalOpen}
          variant="blur"
          onOpenChange={setIsCancelModalOpen}
        >
          <Modal.Container scroll="inside">
            <Modal.Dialog className="max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden rounded-[2.5rem] border border-default-200 bg-surface/90 backdrop-blur-xl p-2">
              {({ close }) => (
                <div className="p-6 flex flex-col flex-1 min-h-0 overflow-y-auto">
                  <Modal.Header className="flex flex-col gap-1 items-center text-center px-4 pt-4">
                    <div className="w-16 h-16 rounded-3xl bg-danger/10 text-danger flex items-center justify-center mb-4">
                      <Trash2 size={32} />
                    </div>
                    <Modal.Heading className="text-3xl font-black tracking-tight text-foreground">
                      Cancel Booking?
                    </Modal.Heading>
                    <p className="text-muted font-medium">
                      Are you sure you want to cancel this reservation?
                    </p>
                  </Modal.Header>
                  <Modal.Body className="py-8">
                    {selectedBooking?.recurrenceGroupId && (
                      <div className="p-4 bg-default-50 rounded-2xl border border-default-100 flex flex-col gap-3">
                        <Checkbox
                          isSelected={cancelAll}
                          onChange={setCancelAll}
                        >
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Checkbox.Content>
                            <Label className="text-sm font-bold">
                              Cancel entire series
                            </Label>
                          </Checkbox.Content>
                        </Checkbox>
                        <p className="text-[10px] text-default-400 font-bold uppercase ml-7">
                          This is part of a recurring booking series.
                        </p>
                      </div>
                    )}
                  </Modal.Body>
                  <Modal.Footer className="px-0 pb-2 gap-3 flex flex-col sm:flex-row">
                    <Button
                      className="flex-1 h-14 rounded-2xl font-bold border-default-200"
                      variant="ghost"
                      onPress={close}
                    >
                      Go Back
                    </Button>
                    <Button
                      className="flex-1 h-14 rounded-2xl font-bold shadow-xl shadow-danger/20"
                      isPending={!!actionLoading}
                      variant="danger"
                      onPress={() =>
                        handleCancelBooking(selectedBooking.id, cancelAll)
                      }
                    >
                      Yes, Cancel
                    </Button>
                  </Modal.Footer>
                </div>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
