import { forwardRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { VirtuosoGrid } from "react-virtuoso";

const ItemWrapper = ({ children, ...props }) => (
    <div
        {...props}
        style={{
            display: 'flex',
            flex: 1,
            textAlign: 'center',
            padding: '1rem 1rem',
            border: '1px solid gray',
            whiteSpace: 'nowrap',
        }}
    >
        {children}
    </div>
)

function TestGrid() {

    return (
        <div className="h-full flex flex-col flex-1 min-w-0">
            <div className="w-full px-4 py-4 flex-1 min-h-0">
                {/* There is a call back function which contains the html to render for each row so you pass in 
        data for ti to render that render function is hte itemContent={(index, item)=><CustomCell>}
        
        <VirtuosoGrid
            data={items}
            itemContent={(index, item) => <Card {...item} />}
        />

        for item content it calls a callback and injects parameters into it, you get the index by default
        then you also need ot pass in the item which rep the data you pass in

        <VirtuosoGrid
          data={items}
          itemContent={(index, item) => <Card {...item} />}
        />

        ^ example and thne the item content needs special rendering
          
          itemContent you can give it a lamdba and that lambda returns jsx specifically for that specific cell

          the components prop into virtuoso grid overrides the lastclassname and itemclassname
          the listclassname applies to virtuoso list div and itemclassname applies to each virtuoso item div

          Note taht the itemclassname is important since the width of it sets the columns per row 
          Note if we wanted to have an option to view x amount per row we can just use a state var insite of the itemclassname value
          since it is a string just use ${}
        */}


        {/* 
        
            How to handle lazy loading?

            right but in those functions it can tell when it is scrolling and you can tell where the rangeChanged and scrollng rate but where does it allow you to know what is mounted at that moment? I assume the callback used to render the on DOM rows is itemContent so that is where we would need to either 1 lazy load or check the map if it is in the use the cached data to render, the image link would get either from cache or from the lazy load (but does the browser handle the laoding of the img itself?) But another concern is on each scroll of virtualization that itemcontent call back runs each time meaning that process needs to run ecah time even though we cache would it be possible that it is inefficent?
        
            ^ above is ok but that would be individual and not batched 

            Apparently you can also do it batched 
            rangechanged will hand over the entire window [startindex, endindex]
            but then not sure since rangechanged callback is isolated of those cells callback
            
            I was told one way is after the range query gets the data you force trigger a reredner of the map which
            then the itemsContent that are mounted rerenders and is synced but that is not the most effiecnt 
        */}

                <VirtuosoGrid
                    style={{ height: "100%" }}
                    totalCount={1000}
                    // itemContent={(i) => <ItemWrapper>Item {i}</ItemWrapper>}
                    itemContent={(i) => <Card><CardHeader><CardTitle> <img src="https://picsum.photos/300/200" alt={`Mock item ${i}`}
                        className="w-full h-40 object-cover rounded-t-md" /> Item {i}</CardTitle></CardHeader></Card>}
                    listClassName="flex flex-wrap"
                    itemClassName="w-1/5 p-1 box-border"
                    className="border p-4"
                />
            </div>
        </div>
    );
}

export default TestGrid;