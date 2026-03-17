const Employee = require('../models/Employee');
const Bill = require('../models/Bill');

exports.getAll = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active !== undefined) query.isActive = active === 'true';

    const employees = await Employee.find(query).sort({ name: 1 });
    res.json({ employees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json({ employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const employeeId = req.params.id;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const bills = await Bill.find({
      'services.employee': employeeId,
      status: 'completed',
      ...dateFilter,
    });

    let totalRevenue = 0;
    let serviceCount = 0;

    bills.forEach(bill => {
      bill.services.forEach(s => {
        if (s.employee && s.employee.toString() === employeeId) {
          totalRevenue += s.price;
          serviceCount++;
        }
      });
    });

    const employee = await Employee.findById(employeeId);
    const commission = totalRevenue * (employee.commissionRate / 100);

    res.json({
      employee: employee.name,
      totalRevenue,
      serviceCount,
      commissionRate: employee.commissionRate,
      commissionEarned: commission,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
