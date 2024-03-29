import { useEffect, useState } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import {Chart, ArcElement} from 'chart.js'
Chart.register(ArcElement);
import PieChart from './piechart';


const ExpenseForm = ({ onExpenseAdded }) => {
  
  const [expense, setExpense] = useState({});
  const [wallet, setWallet] = useState({});
  
  const [selectedTag, setSelectedTag] = useState(null); // Add this

  const TAGS = [
    {
      name: 'SIPs',
      backgroundColor: 'red',
      color: 'white',
    },
    {
      name: 'Travel',
      backgroundColor: 'blue',
      color: 'white',
    },
    {
      name: 'Shopping',
      backgroundColor: 'green',
      color: 'white',
    },
    {
      name: 'Food',
      backgroundColor: 'orange',
      color: 'white',
    },
    {
      name: 'Bills',
      backgroundColor: 'purple',
      color: 'white',
    }
  ];


  const fetchData = async () => {
    try {
      const response = await axios.get('/api/mongodb');
      if (!response || !response.data) {
        throw new Error('Error retrieving data from MongoDB');
      }

      // Assuming response.data contains expenses data, you may need to adjust this
      const expensesData = response.data;

      console.log('Fetched data:', expensesData);
      
      const tagTotals = {}; // Calculate tag totals
      let totalAllTags = 0; 
      
      expensesData.forEach((expense) => {
        if (expense.wallet) {
          Object.keys(expense.wallet).forEach((tag) => {
            const amount = expense.wallet[tag].total;
  
            // Check if amount is a valid number
            if (!isNaN(amount) && amount !== null) {
              if (tagTotals[tag]) {
                tagTotals[tag] += amount;
              } else {
                tagTotals[tag] = amount;
              }

              totalAllTags += amount;
            }
          });
        }
        
      });
      

      console.log('Calculated wallet:', tagTotals);
      console.log('Total for all tags:', totalAllTags);
      localStorage.setItem('totalAllTags', totalAllTags);
      localStorage.setItem('tagTotals', JSON.stringify(tagTotals));

      setWallet({
        tagTotals,
        totalAllTags,
      });
    } catch (error) {
      console.error('Error occurred while retrieving data from MongoDB', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const response = await axios.post('/api/expenses', expense);

    try {
      if (!response || !response.data) {
        throw new Error('Error retrieving data from MongoDB');
      }
      fetchData();
      setExpense({
        name: '',
        amount: 0,
        tag: '',
      });

    } catch (error) {
      console.error('Error occurred while adding/updating expense:', error);
    }
  };

  const handleTagSelect = (tag) => {
    setExpense({
      ...expense,
      tag,
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('api_key', 'TEST'); // Replace with your actual API key
      formData.append('recognizer', 'auto');
      formData.append('file', file);
  
      try {
        const response = await axios.post('https://ocr2.asprise.com/api/v1/receipt', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
  
        // Handle OCR results in the response.data object
        console.log('OCR Results:', response.data);
  
        // Extract and update the expense state based on the OCR results
        const extractedName = response.data?.receipts[0]?.merchant_name || 'Unknown';
        const extractedAmount = response.data?.receipts[0]?.total || 0;
        const extractedTag = response.data?.receipts[0]?.merchant || 'Other';
  
        setExpense({
          ...expense,
          name: extractedName,
          amount: extractedAmount,
          tag: extractedTag,
        });
      } catch (error) {
        console.error('Error in OCR API request:', error);
      }
    }
  };

  const renderPieChart = () => {
    if (!wallet.tagTotals || Object.keys(wallet.tagTotals).length === 0) {
      // Return some placeholder or loading state if data is not available
      return <p>Loading...</p>;
    }

    const chartOptions = {
      maintainAspectRatio: false, // Add this to allow controlling the size
    };

    return <PieChart tagTotals={wallet.tagTotals} options={chartOptions}/>;
};

   return (
    <div className="flex flex-col lg:flex-row gap-40 justify-between">
      <div className="relative w-2/5  shadow-md bg-silver rounded-lg border border-gray-300 top-40 left-20 p-4 mx-6 flex justify-center items-center">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="expense-name" className="block font-medium">
              Expense Name
            </label>
            <input
              type="text"
              id="expense-name"
              name="expense-name"
              value={expense?.name}
              onChange={(e) =>
                setExpense({
                  ...expense,
                  name: e.target.value,
                })
              }
              className="form-input rounded-lg my-2 p-2"
            />
          </div>
          <div>
            <label htmlFor="expense-amount" className="block font-medium">
              Expense Amount
            </label>
            <input
              type="number"
              id="expense-amount"
              name="expense-amount"
              value={expense?.amount}
              onChange={(e) =>
                setExpense({
                  ...expense,
                  amount: parseInt(e.target.value, 10),
                })
              }
              className="form-input rounded-lg my-2 p-2"
            />
          </div>
          <div className="space-x-2">
            <span className="font-medium mb-2">Tags</span>
            <div className="p-2">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag tag-${tag?.name.toLowerCase()} ${
                  expense?.tag === tag?.name ? 'tag-selected' : ''
                }`}
                onClick={() => handleTagSelect(tag?.name)}
              >
                {tag?.name}
              </button>
            ))}
            </div>
          </div>
          <div>
            <label htmlFor="receipt-image" className="block font-medium">
              Upload Receipt
            </label>
            <input
              type="file"
              accept="image/*"
              id="receipt-image"
              name="receipt-image"
              onChange={handleImageUpload}
              className="form-input my-4"
            />
          </div>

          {expense.amount !== undefined && (
            <p>Extracted Amount: {expense.amount.toFixed(2)}</p>
          )}

          {expense.tag && (
            <p>Identified Tag: {expense.tag}</p>
          )}

          {expense.name && (
            <p>Extracted Name: {expense.name}</p>
          )}
          
          <div className="flex justify-center items-center gap-2">
            <button type="submit" className="btn btn-primary">
              Add Expense
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => {}}>
              Report
            </button>
          </div>
        </form>
      </div>
      <div className="relative shadow-md bg-white rounded-lg border border-gray-300 top-40 right-20 p-4 mx-6 w-4/5">
        <h1 className="flex justify-center items-centre mb-10 text-xl font-semibold capitalize mt-5">
          Tag-wise expense
        </h1>
        <div className="flex justify-center items-center h-96">
        <div>{renderPieChart()}</div>
        </div>
        <div className='flex gap-2 justify-center items-center'>
        {TAGS.map((tag) => (
            <button
              key={tag.name}
              type="button"
              style={{
                backgroundColor: `${tag.backgroundColor}`,
                color: selectedTag === tag.name ? 'yellow' : 'white',
              }}
              className="tag rounded-lg my-2"
              onClick={() => handleTagSelect(tag.name)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;
