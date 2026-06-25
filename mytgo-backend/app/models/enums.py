from enum import Enum


class UserRole(str, Enum):
    CUSTOMER = "customer"
    MECHANIC = "mechanic"
    VALET = "valet"
    ADMIN = "admin"


class ServiceType(str, Enum):
    REPAIR = "repair"
    CLEANING = "cleaning"
    INSPECTION = "inspection"


class AppointmentStatus(str, Enum):
    PENDING = "pending"
    QUOTE_SENT = "quote_sent"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ValetStatus(str, Enum):
    REQUESTED = "requested"
    ASSIGNED = "assigned"
    PICKING_UP = "picking_up"
    IN_TRANSIT_TO_SERVICE = "in_transit_to_service"
    AT_SERVICE = "at_service"
    RETURNING = "returning"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class ServiceHistoryOperationType(str, Enum):
    MAINTENANCE = "maintenance"
    REPAIR = "repair"
    INSPECTION = "inspection"
    CLEANING = "cleaning"
    TIRE = "tire"
    OTHER = "other"
