import {
  Car,
  Coffee,
  Factory,
  Heart,
  Laptop,
  type LucideIcon,
  Package,
  Shirt,
  ShoppingBag,
  Store,
  Utensils,
  Wrench,
} from "lucide-react";

export const storeIconMap: Record<string, LucideIcon> = {
  store: Store,
  "shopping-bag": ShoppingBag,
  coffee: Coffee,
  utensils: Utensils,
  shirt: Shirt,
  wrench: Wrench,
  laptop: Laptop,
  heart: Heart,
  package: Package,
  car: Car,
  factory: Factory,
};

export const storeIconList = [
  { key: "store", label: "ร้านค้าทั่วไป", icon: Store },
  { key: "shopping-bag", label: "ร้านค้าปลีก / แฟชั่น", icon: ShoppingBag },
  { key: "coffee", label: "คาเฟ่ / ร้านกาแฟ", icon: Coffee },
  { key: "utensils", label: "ร้านอาหาร", icon: Utensils },
  { key: "shirt", label: "ร้านเสื้อผ้า", icon: Shirt },
  { key: "wrench", label: "บริการ / ซ่อมบำรุง", icon: Wrench },
  { key: "laptop", label: "ไอที / อุปกรณ์ไอที", icon: Laptop },
  { key: "heart", label: "สุขภาพ / ความงาม", icon: Heart },
  { key: "package", label: "คลังสินค้า / ขนส่ง", icon: Package },
  { key: "car", label: "ยานยนต์ / อะไหล่", icon: Car },
];
