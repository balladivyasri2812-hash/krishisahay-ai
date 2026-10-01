import React, { useState } from 'react';
import { Tractor, Wrench, CheckCircle, Clock, Plus, Phone } from 'lucide-react';
import { FarmProfile } from '../../types/agricultural';

interface EquipmentRentalViewProps {
  farm: FarmProfile;
}

export const EquipmentRentalView: React.FC<EquipmentRentalViewProps> = ({ farm }) => {
  const [equipmentList, setEquipmentList] = useState([
    {
      id: 1,
      name: 'Mahindra 35 HP Di Tractor',
      owner: 'Ramesh Reddy (Medak)',
      rate: 800,
      icon: '🚜',
      available: true,
      specs: 'Rotavator & 3-MB Plough Attached',
    },
    {
      id: 2,
      name: 'Multi-Crop Combine Harvester',
      owner: 'Kisan Seva Kendra (Warangal)',
      rate: 2200,
      icon: '🌾',
      available: true,
      specs: 'Paddy, Wheat & Soybean Cutter Bar',
    },
    {
      id: 3,
      name: 'Rotary Power Tiller 8 HP',
      owner: 'Suresh Patel (Karimnagar)',
      rate: 450,
      icon: '⚙️',
      available: false,
      specs: 'Ideal for Intercultural Tillage',
    },
    {
      id: 4,
      name: 'Automatic Laser Land Leveller',
      owner: 'Precision Agri Hub (Nalgonda)',
      rate: 600,
      icon: '📐',
      available: true,
      specs: 'Grade slope accuracy ±2mm for water saving',
    },
    {
      id: 5,
      name: 'Agri-Drone Sprayer (16 Litre)',
      owner: 'V-Drones Tech (Khammam)',
      rate: 1200,
      icon: '🚁',
      available: true,
      specs: 'GPS autonomous spray, 10 min/acre',
    },
  ]);

  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // New equipment form state
  const [eqName, setEqName] = useState('');
  const [eqRate, setEqRate] = useState('');
  const [eqLoc, setEqLoc] = useState('');

  const handleBook = (name: string) => {
    setBookingSuccess(`Booking request for ${name} dispatched to owner!`);
    setTimeout(() => setBookingSuccess(null), 3500);
  };

  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName || !eqRate) return;

    setEquipmentList([
      ...equipmentList,
      {
        id: Date.now(),
        name: eqName,
        owner: `${farm.farmerName} (${eqLoc || farm.location})`,
        rate: parseInt(eqRate, 10),
        icon: '🚜',
        available: true,
        specs: 'Farm Machinery Shared Economy',
      },
    ]);

    setEqName('');
    setEqRate('');
    setEqLoc('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-cyan-100 text-cyan-800">
              <Tractor className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-emerald-950 font-serif">
              Equipment Rental Marketplace
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Rent agricultural machinery from verified local farmers — peer-to-peer shared economy model.
          </p>
        </div>
      </div>

      {bookingSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bookingSuccess}</span>
        </div>
      )}

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {equipmentList.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl border border-stone-200 hover:border-cyan-400 hover:shadow-md transition-all p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-4xl p-2 rounded-2xl bg-cyan-50">{item.icon}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    item.available
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {item.available ? 'Available Now' : 'Currently Booked'}
                </span>
              </div>

              <h4 className="font-bold text-sm text-emerald-950 font-serif mt-3">{item.name}</h4>
              <p className="text-[11px] text-stone-500">{item.owner}</p>
              <p className="text-[11px] text-cyan-900 font-medium mt-1">{item.specs}</p>

              <div className="mt-4 pt-3 border-t border-stone-100">
                <span className="text-xs text-stone-400 block text-[10px] uppercase font-bold">Daily Rental Rate</span>
                <div className="text-xl font-black font-serif text-cyan-800">
                  ₹{item.rate.toLocaleString()} <span className="text-xs font-normal text-stone-500">/ Day</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleBook(item.name)}
              disabled={!item.available}
              className="mt-4 w-full py-2 bg-gradient-to-r from-blue-700 to-cyan-700 hover:from-blue-800 text-white font-bold rounded-xl text-xs disabled:opacity-40 transition-all active:scale-98"
            >
              {item.available ? 'Book Equipment Now' : 'Join Waiting List'}
            </button>
          </div>
        ))}
      </div>

      {/* List Your Equipment Form */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm text-xs">
        <h3 className="text-sm font-bold text-emerald-950 uppercase font-serif tracking-wider mb-3">
          List Your Idle Machinery for Rental Income
        </h3>

        <form onSubmit={handleAddEquipment} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Equipment Name</label>
            <input
              type="text"
              placeholder="e.g. Tractor 45 HP with Plough"
              value={eqName}
              onChange={(e) => setEqName(e.target.value)}
              required
              className="w-full p-2 border border-stone-200 rounded-xl"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Daily Rate (₹)</label>
            <input
              type="number"
              placeholder="850"
              value={eqRate}
              onChange={(e) => setEqRate(e.target.value)}
              required
              className="w-full p-2 border border-stone-200 rounded-xl font-bold font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Location / Mandal</label>
            <input
              type="text"
              placeholder="e.g. Warangal Rural"
              value={eqLoc}
              onChange={(e) => setEqLoc(e.target.value)}
              className="w-full p-2 border border-stone-200 rounded-xl"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs shadow-xs"
            >
              + Publish Equipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
