const url = 'http://localhost:3002/api/screenshot';
const body = {
  url: 'https://www.douyin.com/user/MS4wLjABAAAAl772J8S_5bblTWU5GsGNMZSGnyi9r8r2YFkULTV6nsc?from_tab_name=main'
};

console.log('Testing URL:', body.url);

(async () => {
    try {
        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response body length:', text.length);
        console.log('Response snippet:', text.substring(0, 500));
        
        try {
            const json = JSON.parse(text);
            console.log('Success:', json.success);
            if (json.data && json.data.url) {
                console.log('Image URL:', json.data.url);
            }
        } catch (e) {
            console.log('Not JSON');
        }

    } catch (error) {
        console.error('Error:', error);
    }
})();
