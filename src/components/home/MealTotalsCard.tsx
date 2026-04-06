'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coffee, Egg, Sandwich, CupSoda, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';

interface MealTotalsCardProps {
  attendanceSummary: {
    coffee: { present: number; absent: number; sick: number };
    breakfast: { present: number; absent: number; sick: number };
    lunch: { present: number; absent: number; sick: number };
    tea: { present: number; absent: number; sick: number };
    dinner: { present: number; absent: number; sick: number };
  } | null;
}

const mealTimes = [
  { id: 'coffee',    label: 'Coffee',    icon: Coffee },
  { id: 'breakfast', label: 'Breakfast', icon: Egg },
  { id: 'lunch',     label: 'Lunch',     icon: Sandwich },
  { id: 'tea',       label: 'Tea',       icon: CupSoda },
  { id: 'dinner',    label: 'Dinner',    icon: Utensils },
];

const mealColors = {
  coffee:    { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'text-blue-600',   badge: 'bg-blue-100 text-blue-800' },
  breakfast: { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'text-green-600',  badge: 'bg-green-100 text-green-800' },
  lunch:     { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-800' },
  tea:       { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-800' },
  dinner:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'text-red-600',    badge: 'bg-red-100 text-red-800' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

const MealTotalsCard: React.FC<MealTotalsCardProps> = ({ attendanceSummary }) => {
  if (!attendanceSummary) return null;

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-5 gap-4"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
    >
      {mealTimes.map((meal, index) => {
        const mealData = attendanceSummary[meal.id as keyof typeof attendanceSummary];
        const totalPresent = mealData?.present || 0;
        const totalAbsent  = mealData?.absent  || 0;
        const totalSick    = mealData?.sick    || 0;
        const totalStudents = totalPresent + totalAbsent + totalSick;
        const colors = mealColors[meal.id as keyof typeof mealColors];

        return (
          <motion.div
            key={meal.id}
            variants={cardVariants}
            whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
          >
            <Card className={`${colors.bg} ${colors.border} hover:shadow-md transition-shadow`}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    initial={{ rotate: 0 }}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <meal.icon className={`h-8 w-8 mb-2 ${colors.icon}`} />
                  </motion.div>
                  <h3 className="font-medium text-lg mb-2">{meal.label}</h3>
                  <div className="space-y-2 w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total:</span>
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                      >
                        <Badge variant="secondary" className={`${colors.badge} text-lg px-4 py-1`}>
                          {totalStudents}
                        </Badge>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default MealTotalsCard;
