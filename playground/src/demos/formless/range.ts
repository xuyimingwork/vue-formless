import { createFormControls } from 'vue-formless'
import DateRangeOne from './DateRangeOne.vue'
import DateRangeTwo from './DateRangeTwo.vue'

export const Range = createFormControls({
  dateRangeOne: {
    label: '行程日期',
    component: DateRangeOne,
    model: ['start', 'end'],
    prop: ['startTime', 'endTime'],
  },
  dateRangeTwo: {
    label: '签证日期',
    component: DateRangeTwo,
    model: ['start', 'end'],
    prop: ['fromTime', 'toTime'],
  },
})
