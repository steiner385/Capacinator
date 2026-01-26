import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DataTable, Column } from '../DataTable';

// Mock the ui components
jest.mock('../table', () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableHeader: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
  TableBody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
}));

jest.mock('../button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('../spinner', () => ({
  Spinner: ({ size, className }: any) => (
    <div className={className} data-testid="spinner">
      Loading...
    </div>
  ),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('DataTable Component', () => {
  interface TestData {
    id: number;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    joinDate: Date;
    salary: number;
  }

  const mockData: TestData[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Developer', status: 'active', joinDate: new Date('2023-01-15'), salary: 75000 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Designer', status: 'active', joinDate: new Date('2023-02-20'), salary: 70000 },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager', status: 'inactive', joinDate: new Date('2022-11-10'), salary: 90000 },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Developer', status: 'active', joinDate: new Date('2023-03-05'), salary: 80000 },
    { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', role: 'Designer', status: 'active', joinDate: new Date('2023-04-12'), salary: 72000 },
  ];

  const columns: Column<TestData>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', sortable: true },
    { 
      key: 'status', 
      header: 'Status', 
      render: (value) => (
        <span className={value === 'active' ? 'text-green-600' : 'text-gray-500'}>
          {value}
        </span>
      ) 
    },
    { key: 'salary', header: 'Salary', sortable: true, render: (value) => `$${value.toLocaleString()}` },
  ];

  describe('Basic Rendering', () => {
    test('renders table with correct headers', () => {
      render(<DataTable data={mockData} columns={columns} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(5);
      expect(headers[0]).toHaveTextContent('Name');
      expect(headers[1]).toHaveTextContent('Email');
      expect(headers[2]).toHaveTextContent('Role');
      expect(headers[3]).toHaveTextContent('Status');
      expect(headers[4]).toHaveTextContent('Salary');
    });

    test('renders data rows correctly', () => {
      render(<DataTable data={mockData} columns={columns} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      // There are multiple developers, so use getAllByText
      const developers = screen.getAllByText('Developer');
      expect(developers.length).toBeGreaterThan(0);
      expect(screen.getByText('$75,000')).toBeInTheDocument();
    });

    test('applies custom render functions', () => {
      render(<DataTable data={mockData} columns={columns} />);

      const activeStatuses = screen.getAllByText('active');
      activeStatuses.forEach(status => {
        expect(status).toHaveClass('text-green-600');
      });

      const inactiveStatus = screen.getByText('inactive');
      expect(inactiveStatus).toHaveClass('text-gray-500');
    });

    test('renders empty state when no data', () => {
      render(<DataTable data={[]} columns={columns} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    test('renders custom empty message', () => {
      render(<DataTable data={[]} columns={columns} emptyMessage="No records found" />);

      expect(screen.getByText('No records found')).toBeInTheDocument();
    });

    test('renders loading state', () => {
      render(<DataTable data={mockData} columns={columns} loading={true} />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('Sorting Functionality', () => {
    test('sorts string columns ascending and descending', async () => {
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} />);

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toBeInTheDocument();

      // Initial order
      let rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('John Doe')).toBeInTheDocument();

      // Click to sort ascending
      await user.click(nameHeader!);
      await waitFor(() => {
        rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('Alice Brown')).toBeInTheDocument();
      });

      // Click to sort descending
      await user.click(nameHeader!);
      await waitFor(() => {
        rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('John Doe')).toBeInTheDocument();
      });

      // Click to remove sort
      await user.click(nameHeader!);
      await waitFor(() => {
        rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('John Doe')).toBeInTheDocument();
      });
    });

    test('sorts numeric columns correctly', async () => {
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} />);

      const salaryHeader = screen.getByText('Salary').closest('th');
      
      // Click to sort ascending
      await user.click(salaryHeader!);
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('$70,000')).toBeInTheDocument(); // Lowest salary
      });

      // Click to sort descending
      await user.click(salaryHeader!);
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('$90,000')).toBeInTheDocument(); // Highest salary
      });
    });

    test('handles null and undefined values in sorting', async () => {
      const columnsWithoutRender: Column<TestData>[] = [
        { key: 'name', header: 'Name', sortable: true },
        { key: 'salary', header: 'Salary', sortable: true }, // No render function to handle null
      ];
      
      const dataWithNulls = [
        mockData[0],
        mockData[1],
        { ...mockData[2], salary: null as any },
        { ...mockData[3], salary: undefined as any },
      ];

      const user = userEvent.setup();
      render(<DataTable data={dataWithNulls} columns={columnsWithoutRender} />);

      const salaryHeader = screen.getByText('Salary').closest('th');
      
      await user.click(salaryHeader!);
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // Check that rows with null/undefined are sorted to the end
        const lastRow = rows[rows.length - 1];
        // The cell will be empty or show the raw null/undefined value
        expect(within(lastRow).getAllByRole('cell')[1].textContent).toBeFalsy();
      });
    });

    test('non-sortable columns do not have sort functionality', async () => {
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} />);

      const emailHeader = screen.getByText('Email').closest('th');
      expect(emailHeader).not.toHaveClass('cursor-pointer');
      
      // Clicking should not change order
      await user.click(emailHeader!);
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('john@example.com')).toBeInTheDocument();
    });

    test('displays sort icons on sortable columns', () => {
      render(<DataTable data={mockData} columns={columns} />);

      // Sortable columns should have sort icons
      const nameHeader = screen.getByText('Name').closest('th');
      const roleHeader = screen.getByText('Role').closest('th');
      const salaryHeader = screen.getByText('Salary').closest('th');
      
      // Check that sortable columns have the flex layout for icons
      expect(within(nameHeader!).getByText('Name').parentElement).toHaveClass('flex items-center');
      expect(within(roleHeader!).getByText('Role').parentElement).toHaveClass('flex items-center');
      expect(within(salaryHeader!).getByText('Salary').parentElement).toHaveClass('flex items-center');

      // Non-sortable columns should not have icons
      const emailHeader = screen.getByText('Email').closest('th');
      const statusHeader = screen.getByText('Status').closest('th');
      
      // These still have flex layout but no sort functionality
      expect(emailHeader).not.toHaveClass('cursor-pointer');
      expect(statusHeader).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Pagination', () => {
    test('displays correct pagination info', () => {
      render(<DataTable data={mockData} columns={columns} itemsPerPage={2} />);

      expect(screen.getByText('Showing 1 to 2 of 5 entries')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    test('paginates data correctly', () => {
      render(<DataTable data={mockData} columns={columns} itemsPerPage={2} />);

      // First page
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });

    test('navigation buttons work correctly', async () => {
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} itemsPerPage={2} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      const previousButton = screen.getByRole('button', { name: /previous/i });
      const firstButton = screen.getByRole('button', { name: /first/i });
      const lastButton = screen.getByRole('button', { name: /last/i });

      // Initially on page 1
      expect(previousButton).toBeDisabled();
      expect(firstButton).toBeDisabled();

      // Go to page 2
      await user.click(nextButton);
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

      // Go to last page
      await user.click(lastButton);
      expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
      expect(screen.getByText('Charlie Davis')).toBeInTheDocument();
      expect(nextButton).toBeDisabled();
      expect(lastButton).toBeDisabled();

      // Go back to first page
      await user.click(firstButton);
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    test('hides pagination for single page', () => {
      render(<DataTable data={mockData.slice(0, 2)} columns={columns} itemsPerPage={10} />);

      expect(screen.queryByText(/Page \d of \d/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    test('maintains current page when sorting', async () => {
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} itemsPerPage={2} />);

      // Go to page 2
      await user.click(screen.getByRole('button', { name: /next/i }));
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

      // Sort by name
      const nameHeader = screen.getByText('Name').closest('th');
      await user.click(nameHeader!);

      // Should still be on page 2 but with sorted data
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('Charlie Davis')).toBeInTheDocument(); // Sorted name on page 2
    });
  });

  describe('Row Click Handling', () => {
    test('calls onRowClick when row is clicked', async () => {
      const user = userEvent.setup();
      const onRowClick = jest.fn();
      render(<DataTable data={mockData} columns={columns} onRowClick={onRowClick} />);

      const firstRow = screen.getByRole('row', { name: /john doe/i });
      await user.click(firstRow);

      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    test('applies hover styles when onRowClick is provided', () => {
      render(<DataTable data={mockData} columns={columns} onRowClick={() => {}} />);

      const rows = screen.getAllByRole('row').slice(1); // Skip header row
      rows.forEach(row => {
        expect(row).toHaveClass('cursor-pointer');
      });
    });

    test('does not apply hover styles when onRowClick is not provided', () => {
      render(<DataTable data={mockData} columns={columns} />);

      const rows = screen.getAllByRole('row').slice(1); // Skip header row
      rows.forEach(row => {
        expect(row).not.toHaveClass('cursor-pointer');
      });
    });
  });

  describe('Column Features', () => {
    test('handles nested property access', () => {
      const nestedData = [
        { id: 1, user: { name: 'John', details: { age: 30 } }, active: true },
        { id: 2, user: { name: 'Jane', details: { age: 25 } }, active: false },
      ];

      const nestedColumns: Column<any>[] = [
        { key: 'user.name', header: 'Name' },
        { key: 'user.details.age', header: 'Age' },
      ];

      render(<DataTable data={nestedData} columns={nestedColumns} />);

      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    test('applies column width styles', () => {
      const columnsWithWidth: Column<TestData>[] = [
        { key: 'name', header: 'Name', width: '200px' },
        { key: 'email', header: 'Email', width: '300px' },
      ];

      render(<DataTable data={mockData.slice(0, 1)} columns={columnsWithWidth} />);

      const headers = screen.getAllByRole('columnheader');
      expect(headers[0]).toHaveStyle({ width: '200px' });
      expect(headers[1]).toHaveStyle({ width: '300px' });
    });

    test('render function receives both value and full row', () => {
      const renderFn = jest.fn((value, row) => `${row.name}: ${value}`);
      const customColumns: Column<TestData>[] = [
        { key: 'role', header: 'Role', render: renderFn },
      ];

      render(<DataTable data={mockData.slice(0, 1)} columns={customColumns} />);

      expect(renderFn).toHaveBeenCalledWith('Developer', mockData[0]);
      expect(screen.getByText('John Doe: Developer')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty columns array', () => {
      render(<DataTable data={mockData} columns={[]} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    });

    test('handles mixed data types with proper render functions', () => {
      const mixedData = [
        { id: '1', value: 100, type: 'number' },
        { id: '2', value: '200', type: 'string' },
        { id: '3', value: new Date('2023-01-01'), type: 'date' },
        { id: '4', value: null, type: 'null' },
        { id: '5', value: undefined, type: 'undefined' },
      ];

      const mixedColumns: Column<any>[] = [
        { 
          key: 'value', 
          header: 'Value', 
          render: (value) => {
            if (value === null) return 'N/A';
            if (value === undefined) return '-';
            if (value instanceof Date) return value.toLocaleDateString();
            return String(value);
          }
        },
        { key: 'type', header: 'Type' },
      ];

      render(<DataTable data={mixedData} columns={mixedColumns} />);

      // Check that all values are rendered correctly
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
      // Date format varies by locale, so check the date column exists via its type cell
      expect(screen.getByText('date')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    test('handles very large datasets with pagination', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: 'User',
        status: 'active' as const,
        joinDate: new Date(),
        salary: 50000 + i * 100,
      }));

      render(<DataTable data={largeData} columns={columns} itemsPerPage={20} />);

      expect(screen.getByText('Showing 1 to 20 of 1000 entries')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 50')).toBeInTheDocument();
    });
  });
});