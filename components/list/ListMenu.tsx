import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Ellipsis } from 'lucide-react';


interface ListMenuProps {
  handleViewListItemAdder: () => void;
  handleDeleteList: () => void;
}


const ListMenu = ({
  handleViewListItemAdder,
  handleDeleteList
}: ListMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
      >
        <Button size="icon-sm" variant="ghost" aria-label="List options">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="default"
          className='hover:cursor-pointer text-xs!'
          onSelect={handleViewListItemAdder}
        >
          Add Item
        </DropdownMenuItem>
        {/* <DropdownMenuItem
          variant="default"
          className='hover:cursor-pointer'
        >
          Export
        </DropdownMenuItem> */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant='destructive'
          className='hover:cursor-pointer text-xs!'
          onSelect={handleDeleteList}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ListMenu;